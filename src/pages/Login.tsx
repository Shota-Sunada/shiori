import { useRef, type FormEvent, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MDButton from '../components/MDButton';
import '../styles/login.css';
import { useAuth, type AuthUser } from '../auth-context';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { registerOrRequestPermission } from '../helpers/notifications';
import { jwtDecode } from 'jwt-decode';
import { appFetch } from '../helpers/apiClient';

const Login = () => {
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
    if (id <= USER_ID_MIN || USER_ID_MAX <= id) return '生徒IDは8桁で正しく入力してください。';
    if (password.length < 4) return 'パスワードは4文字以上を入力してください。';
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
            setError('アカウントがロックされている可能性があります。');
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
          <label htmlFor={'student_id'}>{'生徒ID (数字8桁)'}</label>
          <input type="number" name="student_id" id="student_id" placeholder={'生徒ID (202*****) を入力'} required ref={student_id_ref} />
        </div>
        <div className="flex flex-col mb-2">
          <label htmlFor={'password'}>{'パスワード'}</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} name="password" id="password" placeholder={'パスワードを入力'} required ref={password_ref} />
            <span className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-gray-500" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <AiFillEyeInvisible size={24} /> : <AiFillEye size={24} />}
            </span>
          </div>
        </div>
        <p>{'Classiで先生が配信されたものを参考に入力してください。'}</p>
        <p>{'5648は関係ありません。'}</p>
        <MDButton text={'ログイン'} arrowRight type="submit" />
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </form>
    </div>
  );
};

export default Login;
