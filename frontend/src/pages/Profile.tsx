import { useNavigate } from 'react-router-dom';
import StudentDashboard from '../components/StudentDashboard';

export default function Profile() {
  const navigate = useNavigate();

  return (
    <StudentDashboard onClose={() => navigate('/')} />
  );
}
