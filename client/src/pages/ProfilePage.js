import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div>
      <h2>Profile</h2>
      <p>Email: {user?.email}</p>
      <p>Name: {user?.name}</p>
    </div>
  );
};

export default ProfilePage;