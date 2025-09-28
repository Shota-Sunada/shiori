import { loginQAs } from '../data/loginQAs';
import { useRef, type FormEvent, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MDButton from '../components/MDButton';
import { useAuth, type AuthUser } from '../auth-context';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { registerOrRequestPermission } from '../helpers/notifications';
import { jwtDecode } from 'jwt-decode';
import { appFetch } from '../helpers/apiClient';
import { isOffline } from '../helpers/isOffline';

const Login = () => {
  // オフライン状態を動的に監視
  const [offline, setOffline] = useState(isOffline());
  useEffect(() => {
    const update = () => setOffline(isOffline());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const USER_ID_MIN = 20200000;
  const USER_ID_MAX = 20219008;

  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const student_id_ref = useRef<HTMLInputElement>(null);
  const password_ref = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validate = (id?: number, password?: string) => {
    if (!id || !password) return 'ユーザー名とパスワードを入力してください。';
    if (id <= USER_ID_MIN || USER_ID_MAX <= id) return '生徒IDは8桁で、「正しく」入力してください。';
    if (password.length < 4) return 'パスワードは4文字以上で入力してください。';
    return null;
  };

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      const id = student_id_ref.current?.valueAsNumber;
      const password = password_ref.current?.value?.trim();
      const validationError = validate(id, password);
      if (validationError) {
        setError(validationError);
        return;
      }
      try {
        type LoginResp = { token: string; message?: string };
        try {
          const data = await appFetch<LoginResp>(`${SERVER_ENDPOINT}/api/auth/login`, { method: 'POST', jsonBody: { id, password }, parse: 'json' });
          login(data.token);
          const decoded = jwtDecode<AuthUser>(data.token);
          await registerOrRequestPermission(decoded);
          navigate('/');
        } catch (err) {
          const msg = (err as Error).message;
          if (msg.includes('403')) {
            setError('10回以上ログインに失敗したため、アカウントがロックされている可能性があります。管理者に連絡してください。');
          } else if (msg.includes('401') || msg.includes('400')) {
            setError('ユーザー名またはパスワードが正しくありません。');
          } else {
            throw err;
          }
        }
      } catch (err) {
        setError('ログイン中にエラーが発生しました。ネットワーク接続を確認してください。');
        console.error('ログイン中にエラー:', err);
      }
    },
    [navigate, login]
  );

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center">
      <form className="w-[100%] flex flex-col items-center justify-center mt-8" onSubmit={handleSubmit}>
        <img
          onClick={() => window.open('https://gakugai.shudo-h.ed.jp', '_blank', 'noreferrer')}
          className="bg-[#50141c] p-4 rounded-[10px] cursor-pointer"
          src="https://gakugai.shudo-h.ed.jp/hp_assets/images/common/menu_logo.png"
          alt="修道ロゴ"
        />
        <div className="mt-4 flex flex-col items-center justify-center text-xl">
          <p>{'修道高校79回生'}</p>
          <p>{'修学旅行のしおり'}</p>
        </div>
        <p className="text-2xl pt-1">{'ログイン'}</p>
        <div className="flex flex-col mt-2">
          <label htmlFor={'student_id'}>
            <p>{'生徒ID (数字8桁)'}</p>
            <p>{'学生証に書いてあるIDを入力'}</p>
          </label>
          <input type="number" name="student_id" id="student_id" placeholder={'生徒ID (202*****) を入力'} required ref={student_id_ref} />
        </div>
        <div className="flex flex-col mb-2">
          <label htmlFor={'password'}>
            <p>{'パスワード (Classiを参照)'}</p>
          </label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} name="password" id="password" placeholder={'パスワードを入力'} required ref={password_ref} />
            <span className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-gray-500" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <AiFillEyeInvisible size={24} /> : <AiFillEye size={24} />}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center text-center m-2">
          <p>Classiで先生が配信されたものを参考に入力してください。</p>
          {offline && <p className="text-red-500">現在オフラインです。ログイン時にはインターネットへの接続が必要です。ネットワークの接続を確認してください。</p>}
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
        <MDButton text={'ログイン'} arrowRight type="submit" disabled={offline} />
      </form>
      {/* Q&Aセクション */}
      <div className="max-w-md bg-white/80 rounded-lg shadow m-2 p-2">
        <h2 className="text-lg font-bold mb-2 text-center">よくある質問</h2>
        <ul className="space-y-4">
          {loginQAs.map((qa, i) => (
            <li key={i} className="border-b last:border-b-0 pb-2 last:pb-0">
              <div className="font-semibold text-blue-900 mb-1">Q. {qa.question}</div>
              <div className="text-gray-700 pl-2">A. {qa.answer}</div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="m-2">その他不明点は、5-1砂田までお問い合わせください。</p>
      </div>
    </div>
  );
};

export default Login;
