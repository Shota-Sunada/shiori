import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

const Index = (props: { isFirstLogin: boolean; setIsFirstLogin: (value: boolean) => void }) => {
  const { user, loading } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    props.setIsFirstLogin(true);
  });

  if (loading)
    return (
      <div>
        <p>{'読込中...'}</p>
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center pt-[20dvh]">
      <p>
        {props ? 'ようこそ!' : 'おかえりなさい!'}
        {user?.email}
      </p>
    </div>
  );
};

export default Index;
