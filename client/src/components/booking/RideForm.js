import { Formik } from 'formik';
import * as Yup from 'yup';

const RideSchema = Yup.object().shape({
  pickupLocation: Yup.string().required('Required'),
  dropoffLocation: Yup.string().required('Required'),
});

const RideForm = ({ onSubmit }) => {
  return (
    <Formik
      initialValues={{ pickupLocation: '', dropoffLocation: '' }}
      validationSchema={RideSchema}
      onSubmit={onSubmit}
    >
      {({ handleSubmit, isSubmitting }) => (
        <form onSubmit={handleSubmit}>
          <input
            name="pickupLocation"
            placeholder="Pickup Location"
          />
          <input
            name="dropoffLocation"
            placeholder="Dropoff Location"
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Booking...' : 'Book Ride'}
          </button>
        </form>
      )}
    </Formik>
  );
};

export default RideForm;