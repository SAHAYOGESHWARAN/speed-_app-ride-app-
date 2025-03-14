import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCar, FaMapMarkerAlt, FaClock, FaStar, FaGooglePlay, FaAppStore } from 'react-icons/fa';
import { motion } from 'framer-motion';
import heroVideo from '../assets/hero-video.mp4';
import mobileApp from '../assets/mobile-app.png';

const HomePage = () => {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');

  const features = [
    { icon: FaCar, title: "Instant Booking", description: "Get a ride in under 2 minutes" },
    { icon: FaMapMarkerAlt, title: "Live Tracking", description: "Real-time driver tracking" },
    { icon: FaClock, title: "24/7 Service", description: "Available anytime, anywhere" }
  ];

  const testimonials = [
    { name: "Sarah J.", rating: 5, comment: "Best ride-sharing experience ever!", city: "New York" },
    { name: "Mike R.", rating: 5, comment: "Fast, reliable, and affordable!", city: "London" }
  ];

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        <video 
          autoPlay 
          muted 
          loop 
          className="absolute z-0 w-full h-full object-cover"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        
        <div className="relative z-10 text-center text-white px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            Ride Smarter, Arrive Sooner
          </motion.h1>
          
          <div className="max-w-2xl mx-auto bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6 shadow-xl">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter pickup location"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white bg-opacity-20"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                />
                <FaMapMarkerAlt className="absolute left-3 top-4 text-gray-300" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter dropoff location"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white bg-opacity-20"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                />
                <FaMapMarkerAlt className="absolute left-3 top-4 text-gray-300" />
              </div>
              <Link 
                to="/book"
                className="bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                <FaCar className="mr-2" /> Book Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                <Icon className="text-4xl text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">1M+</div>
            <div className="opacity-80">Happy Riders</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">500K+</div>
            <div className="opacity-80">Daily Rides</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">200+</div>
            <div className="opacity-80">Cities Covered</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">4.9</div>
            <div className="opacity-80">App Rating</div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Riders Say</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="bg-white p-8 rounded-xl shadow-lg"
              >
                <div className="flex items-center mb-4">
                  <div className="flex-1">
                    <div className="font-bold">{testimonial.name}</div>
                    <div className="text-gray-600">{testimonial.city}</div>
                  </div>
                  <div className="flex items-center text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <FaStar key={i} className="ml-1" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 italic">"{testimonial.comment}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between px-4">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h2 className="text-3xl font-bold mb-4">Get the Speed App</h2>
            <p className="text-gray-600 mb-6">Book rides faster with our mobile app</p>
            <div className="flex gap-4">
              <button className="bg-black text-white px-6 py-3 rounded-lg flex items-center">
                <FaAppStore className="mr-2 text-2xl" />
                <div className="text-left">
                  <div className="text-xs">Download on the</div>
                  <div className="font-bold">App Store</div>
                </div>
              </button>
              <button className="bg-black text-white px-6 py-3 rounded-lg flex items-center">
                <FaGooglePlay className="mr-2 text-2xl" />
                <div className="text-left">
                  <div className="text-xs">Get it on</div>
                  <div className="font-bold">Google Play</div>
                </div>
              </button>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <img 
              src={mobileApp} 
              alt="Mobile App" 
              className="max-w-xs md:max-w-md transform hover:rotate-3 transition-transform"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;