const escapeStringRegexp = require('escape-string-regexp');
const redis = require('../config/redis');
const logger = require('../utils/logger');

class APIFeatures {
  constructor(query, queryString, model) {
    this.query = query;
    this.queryString = queryString;
    this.model = model;
    this.originalQuery = { ...queryString };
  }

  // Advanced filtering with security and operator support
  filter() {
    const queryObj = this._sanitizeQuery({ ...this.queryString });
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'populate'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Handle advanced query operators
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|ne|in|nin|eq)\b/g, match => `$${match}`);

    // Add regex search for string fields
    if (this.queryString.q) {
      const searchRegex = new RegExp(escapeStringRegexp(this.queryString.q), 'i');
      this.query = this.query.find({ $text: { $search: this.queryString.q } });
      delete queryObj.q;
    }

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  // Secure sorting with field validation
  sort() {
    if (this.queryString.sort) {
      const sortFields = this.queryString.sort.split(',');
      const validSortFields = this._validateFields(sortFields, 'sort');
      const sortBy = validSortFields.join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  // Pagination with metadata
  async paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = Math.min(parseInt(this.queryString.limit, 10) || 100, 1000);
    const skip = (page - 1) * limit;

    // Get total documents count
    const countQuery = this.model.find(this.query.getFilter());
    const total = await countQuery.countDocuments();

    // Set pagination
    this.query = this.query.skip(skip).limit(limit);

    // Pagination metadata
    this.pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    };

    return this;
  }

  // Field limiting with projection
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  // Population of referenced documents
  populate() {
    if (this.queryString.populate) {
      const populateOptions = this.queryString.populate.split(',').map(field => ({
        path: field,
        select: this._getPopulationFields(field)
      }));
      this.query = this.query.populate(populateOptions);
    }
    return this;
  }

  // Full-text search
  search(indexFields) {
    if (this.queryString.search) {
      const searchTerms = this.queryString.search.split(' ').join(' & ');
      this.query = this.query.find({
        $text: { $search: searchTerms },
        ...(indexFields && { $language: 'english' })
      });
      
      if (indexFields) {
        this.query = this.query.select(indexFields);
      }
    }
    return this;
  }

  // Redis caching
  async cache(key, ttl = 60) {
    const cacheKey = `query:${key}:${JSON.stringify(this.originalQuery)}`;
    
    // Try to get cached data
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.debug(`Serving from cache: ${cacheKey}`);
      return JSON.parse(cachedData);
    }

    // Execute query and cache results
    const data = await this.query.exec();
    await redis.set(cacheKey, JSON.stringify(data), 'EX', ttl);
    return data;
  }

  // Query explanation for debugging
  async explain() {
    return this.query.explain();
  }

  // Private validation methods
  _sanitizeQuery(query) {
    // Prevent NoSQL injection
    Object.keys(query).forEach(key => {
      if (typeof query[key] === 'string') {
        query[key] = escapeStringRegexp(query[key]);
      }
    });
    return query;
  }

  _validateFields(fields, type) {
    const schemaPaths = Object.keys(this.model.schema.paths);
    return fields.filter(field => {
      const cleanField = field.startsWith('-') ? field.slice(1) : field;
      return schemaPaths.includes(cleanField);
    });
  }

  _getPopulationFields(field) {
    // Implement logic to get populated fields from schema
    return '-__v -createdAt -updatedAt';
  }
}

module.exports = APIFeatures;