import { useAuth } from '../auth-context';
import { BackToHome } from '../components/MDButton';
import Message from '../components/Message';

const Page404 = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-[80dvh] text-center p-4">
      <h1 className="text-3xl font-bold mb-4">404</h1>
      <Message>
        <p>{'ページが見つかりません。'}</p>
        <p>{'誤ったページへ侵入してしまったようです。'}</p>
      </Message>
      <div className="flex gap-2 flex-wrap items-center justify-center">
        <BackToHome user={user} />
      </div>
    </div>
  );
};

export default Page404;
