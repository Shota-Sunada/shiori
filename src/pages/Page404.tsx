import MDButton from '../components/MDButton';
import { Link } from 'react-router-dom';

const Page404 = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[80dvh] text-center p-4">
      <h1 className="text-3xl font-bold mb-4">404</h1>
      <p className="mb-2">ページが見つかりません。</p>
      <p className="text-sm text-gray-600 mb-6">URL が正しいか確認してください。</p>
      <div className="flex gap-2 flex-wrap items-center justify-center">
        <MDButton text="ホームへ" arrowLeft link="/" />
        <Link to="/login" className="underline text-sm text-blue-700">
          ログインページ
        </Link>
      </div>
    </div>
  );
};

export default Page404;
