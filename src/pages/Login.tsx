import { useRef, type FormEvent, useEffect, useState } from 'react'; // useStateを追加
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import '../styles/login.css';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../auth-context';
import { sha256 } from '../sha256';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai'; // アイコンをインポート

const Login = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const student_id_ref = useRef<HTMLInputElement>(null);
  const password_ref = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false); // パスワード表示切替用のstate

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const student_id = student_id_ref.current?.value;

    // 生徒IDが8桁でない場合はエラーを表示して処理を中断
    if (student_id?.length !== 8) {
      alert('生徒IDは8桁で入力してください。');
      return;
    }

    const password = await sha256(password_ref.current!.value);

    const email = `${student_id}@st.shudo-h.ed.jp`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('ログインに成功しました。');
    } catch (error) {
      alert('ログインに失敗しました。\n生徒IDとパスワードが正しく入力できているか確認してください。\n\n誤りがある場合は、先生や管理者に連絡してください。');
      console.error(error);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center">
      <form className="w-[100%] flex flex-col items-center justify-center p-[10dvh]" onSubmit={handleSubmit}>
        <img
          onClick={() => window.open('https://gakugai.shudo-h.ed.jp', '_blank')}
          className="bg-[#50141c] p-[2dvh] rounded-[10px] cursor-pointer"
          src="https://gakugai.shudo-h.ed.jp/hp_assets/images/common/menu_logo.png"
          alt="修道ロゴ"
        />
        <div className="mt-[2dvh] flex flex-col items-center justify-center text-xl">
          <p>{'修道高校79回生'}</p>
          <p>{'修学旅行のしおり'}</p>
        </div>
        <p className="text-2xl pt-[1dvh]">{'ログイン'}</p>
        <div className="flex flex-col mt-[2dvh]">
          <label htmlFor={'student_id'}>{'生徒ID (数字8桁)'}</label>
          <input type="number" name="student_id" id="student_id" placeholder={'生徒ID (202*****) を入力'} required ref={student_id_ref} />
        </div>
        <div className="flex flex-col mb-[2dvh]">
          <label htmlFor={'password'}>{'パスワード'}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              id="password"
              placeholder={'パスワードを入力'}
              required
              ref={password_ref}
            />
            <span
              className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-gray-500"
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <AiFillEyeInvisible size={24} /> : <AiFillEye size={24} />}
            </span>
          </div>
        </div>
        <button type="submit">
          <Button text={'ログイン'} onClick={() => {}} arrow />
        </button>
      </form>
    </div>
  );
};

export default Login;
