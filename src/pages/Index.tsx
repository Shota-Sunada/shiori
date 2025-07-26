import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { random } from '../random';

const Index = () => {
  const { user, loading } = useAuth();

  const navigate = useNavigate();

  const prefix = ['ようこそ!', 'おかえりなさいませ!', 'おはよう!'];
  const postfix = ['君', '様', 'ちゃん', '殿'];
  const messages = ['修学旅行、楽しんでるかい?'];

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading)
    return (
      <div>
        <p>{'読込中...'}</p>
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center pt-[20dvh]">
      <p>
        {prefix[random(0, prefix.length)]} {user?.email}{postfix[random(0, postfix.length)]}
        {'。'}
        {messages[random(0, messages.length)]}
      </p>
    </div>
  );
};

export default Index;
