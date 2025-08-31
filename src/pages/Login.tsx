import { useRef, type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import '../styles/login.css';
import { useAuth } from '../auth-context';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import { SERVER_ENDPOINT } from '../app';

const Login = () => {
  const { user, loading, login } = useAuth(); // Destructure login from useAuth
  const navigate = useNavigate();
  const student_id_ref = useRef<HTMLInputElement>(null);
  const password_ref = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const id = student_id_ref.current?.value; // Use student_id as id
    const password = password_ref.current?.value;

    if (!id || !password) {
      alert('ユーザー名とパスワードを入力してください。');
      return;
    }

    // 生徒IDが8桁でない場合はエラーを表示して処理を中断
    if (id.length !== 8) {
      alert('生徒IDは8桁で入力してください。');
      return;
    }

    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/auth/login`, {
        // Assuming backend runs on 8080
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: Number(id), password }) // id を数値に変換して送信
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token); // Use the login function from auth-context
        console.log('ログインに成功しました。');
      } else {
        alert(`ログインに失敗しました。\nユーザー名またはパスワードが正しくありません。`);
        console.error('Login failed:', data.message);
      }
    } catch (error) {
      alert('ログイン中にエラーが発生しました。ネットワーク接続を確認してください。');
      console.error('Error during login:', error);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center">
      <form className="w-[100%] flex flex-col items-center justify-center mt-8" onSubmit={handleSubmit}>
        <img
          onClick={() => window.open('https://gakugai.shudo-h.ed.jp', '_blank')}
          className="bg-[#50141c] p-4 rounded-[10px] cursor-pointer"
          src="https://gakugai.shudo-h.ed.jp/hp_assets/images/common/menu_logo.png"
          alt="修道ロゴ"
        />
        <div className="mt-4 flex flex-col items-center justify-center text-xl">
          <p>{'修道高校79回生'}</p>
          <p>{'修学旅行のしおり'}</p>
        </div>
        <p className="text-2xl pt-2">{'ログイン'}</p>
        <div className="flex flex-col mt-4">
          <label htmlFor={'student_id'}>{'生徒ID (数字8桁)'}</label>
          <input type="number" name="student_id" id="student_id" placeholder={'生徒ID (202*****) を入力'} required ref={student_id_ref} />
        </div>
        <div className="flex flex-col mb-4">
          <label htmlFor={'password'}>{'パスワード'}</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} name="password" id="password" placeholder={'パスワードを入力'} required ref={password_ref} />
            <span className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-gray-500" onClick={() => setShowPassword(!showPassword)}>
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
