import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import Button from '../components/Button';

const TeacherIndex = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'読込中...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <p className="m-[10px] text-2xl">{'ようこそ、先生用ページへ'}</p>
      <Button text='生徒を検索' arrowRight link='/teacher/search' ></Button>
      <Button text='点呼' arrowRight link='/teacher/call' ></Button>
      <Button text='お楽しみ会' arrowRight link='/otanoshimi' color='green'></Button>
    </div>
  );
};

export default TeacherIndex;
