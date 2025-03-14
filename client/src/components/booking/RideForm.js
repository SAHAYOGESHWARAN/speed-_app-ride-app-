import { Formik, Field, Form } from 'formik';
import * as Yup from 'yup';
import { ClockIcon, MapPinIcon, TruckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import MapPreview from './MapPreview';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const RideSchema = Yup.object().shape({
  pickupLocation: Yup.string()
    .required('Pickup location is required')
    .matches(/^[a-zA-Z0-9\s,.-]+$/, 'Invalid location format'),
  dropoffLocation: Yup.string()
    .required('Dropoff location is required')
    .matches(/^[a-zA-Z0-9\s,.-]+$/, 'Invalid location format')
    .notOneOf([Yup.ref('pickupLocation')], 'Must be different from pickup'),
  scheduledTime: Yup.date()
    .min(new Date(), 'Must be in the future')
    .required('Pickup time is required'),
  vehicleType: Yup.string()
    .required('Vehicle type is required')
    .oneOf(['bike', 'car', 'van', 'truck'], 'Invalid vehicle type'),
  instructions: Yup.string()
    .max(200, 'Maximum 200 characters')
});

const RideForm = ({ onSubmit }) => {
  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState({ pickup: null, dropoff: null });

  const handleAddressSelect = async (field, value) => {
    // Implement address autocomplete and geocoding here
    // Example: Use Google Maps Places API or similar service
  };

  return (
    <Formik
      initialValues={{
        pickupLocation: '',
        dropoffLocation: '',
        scheduledTime: new Date(),
        vehicleType: '',
        instructions: '',
        acceptTerms: false
      }}
      validationSchema={RideSchema}
      onSubmit={(values, { setSubmitting }) => {
        onSubmit(values);
        setSubmitting(false);
      }}
    >
      {({ values, errors, touched, setFieldValue, isSubmitting }) => (
        <Form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Location
              </label>
              <div className="relative">
                <Field
                  name="pickupLocation"
                  onBlur={(e) => handleAddressSelect('pickup', e.target.value)}
                  className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 ${
                    errors.pickupLocation && touched.pickupLocation
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-indigo-500'
                  }`}
                  placeholder="Enter pickup address"
                />
                <MapPinIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              </div>
              {errors.pickupLocation && touched.pickupLocation && (
                <p className="mt-1 text-sm text-red-600">{errors.pickupLocation}</p>
              )}
            </div>

            {/* Dropoff Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dropoff Location
              </label>
              <div className="relative">
                <Field
                  name="dropoffLocation"
                  onBlur={(e) => handleAddressSelect('dropoff', e.target.value)}
                  className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 ${
                    errors.dropoffLocation && touched.dropoffLocation
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-indigo-500'
                  }`}
                  placeholder="Enter dropoff address"
                />
                <MapPinIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              </div>
              {errors.dropoffLocation && touched.dropoffLocation && (
                <p className="mt-1 text-sm text-red-600">{errors.dropoffLocation}</p>
              )}
            </div>

            {/* Scheduled Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Date & Time
              </label>
              <div className="relative">
                <DatePicker
                  selected={values.scheduledTime}
                  onChange={(date) => setFieldValue('scheduledTime', date)}
                  showTimeSelect
                  minDate={new Date()}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 ${
                    errors.scheduledTime && touched.scheduledTime
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-indigo-500'
                  }`}
                />
                <ClockIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              </div>
              {errors.scheduledTime && touched.scheduledTime && (
                <p className="mt-1 text-sm text-red-600">{errors.scheduledTime}</p>
              )}
            </div>

            {/* Vehicle Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Type
              </label>
              <div className="relative">
                <Field
                  as="select"
                  name="vehicleType"
                  className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 ${
                    errors.vehicleType && touched.vehicleType
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-indigo-500'
                  }`}
                >
                  <option value="">Select vehicle type</option>
                  <option value="bike">Motorcycle</option>
                  <option value="car">Car</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                </Field>
                <TruckIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              </div>
              {errors.vehicleType && touched.vehicleType && (
                <p className="mt-1 text-sm text-red-600">{errors.vehicleType}</p>
              )}
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Instructions
              <span className="ml-1 text-gray-500">(optional)</span>
            </label>
            <div className="relative">
              <Field
                as="textarea"
                name="instructions"
                rows="3"
                className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 ${
                  errors.instructions && touched.instructions
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
                placeholder="e.g., Fragile items, Building access code"
              />
              <InformationCircleIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {200 - values.instructions.length} characters remaining
            </div>
            {errors.instructions && touched.instructions && (
              <p className="mt-1 text-sm text-red-600">{errors.instructions}</p>
            )}
          </div>

          {/* Map Preview */}
          {showMap && (
            <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
              <MapPreview pickup={coordinates.pickup} dropoff={coordinates.dropoff} />
            </div>
          )}

          {/* Terms Agreement */}
          <div className="flex items-center">
            <Field
              type="checkbox"
              name="acceptTerms"
              id="acceptTerms"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-900">
              I agree to the{' '}
              <a href="/terms" className="text-indigo-600 hover:text-indigo-500">
                Terms of Service
              </a>
            </label>
          </div>
          {errors.acceptTerms && touched.acceptTerms && (
            <p className="mt-1 text-sm text-red-600">{errors.acceptTerms}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Calculating Route...
              </div>
            ) : (
              'Get Price Estimate'
            )}
          </button>
        </Form>
      )}
    </Formik>
  );
};

export default RideForm;