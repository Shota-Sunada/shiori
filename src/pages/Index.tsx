import Button from '../components/Button';

const Index = () => {
  return (
    <div className="flex flex-col items-center justify-center pt-[20dvh]">
      <p>{'パスワードを入力してください。'}</p>
      <input className="border-[2px] rounded-[6px] p-[7px] m-[1vh]" type="password" name="password" id="password" />
      <Button text={'ログイン'} onClick={() => {}} />
    </div>
  );
};

export default Index;
