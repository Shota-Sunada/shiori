import { useRef, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import '../styles/login.css';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../auth-context';

const Login = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const student_id_ref = useRef<HTMLInputElement>(null);
  const password_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const student_id = student_id_ref?.current?.value;
    const password = password_ref?.current?.value;

    const email = `${student_id}@st.shudo-h.ed.jp`;
    try {
      await signInWithEmailAndPassword(auth, email, `${password}`);
      console.log('ログインに成功しました。');
    } catch (error) {
      alert('ログインに失敗しました。');
      console.error(error);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center">
      <form className="w-[100%] flex flex-col items-center justify-center p-[10dvh]" onSubmit={handleSubmit}>
        <p className="">{'修道高校79回生 修学旅行のしおり'}</p>
        <p className="text-2xl pt-[2dvh]">{'ログイン'}</p>
        <div className="flex flex-col">
          <label htmlFor={'student_id'}>{'生徒ID (2021から始まる8桁の番号)'}</label>
          <input type="number" name="student_id" id="student_id" placeholder={'生徒IDを入力'} required ref={student_id_ref} />
        </div>
        <div className="flex flex-col">
          <label htmlFor={'password'}>{'パスワード'}</label>
          <input type="password" name="password" id="password" placeholder={'パスワードを入力'} required ref={password_ref} />
        </div>
        {/* <div className="flex flex-col">
          <label htmlFor={'class_number'}>{'クラスを選択してください'}</label>
          <select id="class_number" ref={user_class_ref}>
            <option value={0}>{'==== 選択してください ===='}</option>
            <option value={1}>{'1組'}</option>
            <option value={2}>{'2組'}</option>
            <option value={3}>{'3組'}</option>
            <option value={4}>{'4組'}</option>
            <option value={5}>{'5組'}</option>
            <option value={6}>{'6組'}</option>
            <option value={7}>{'7組'}</option>
            <option value={8}>{'教職員'}</option>
          </select>
        </div> */}
        <button type="submit">
          <Button text={'ログイン'} onClick={() => {}} />
        </button>
      </form>
    </div>
  );
};

export default Login;
