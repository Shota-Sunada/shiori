import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import Button from '../components/Button';
import { handleEnableNotifications } from '../helpers/notifications';

const NonNotification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <p className="font-bold text-2xl">{'通知を有効化してください'}</p>
      <p>{'このしおりでは、通知が重要な役割を果たします。'}</p>
      <p>{'お願いですから、通知を許可してください。'}</p>

      <Button
        text="通知を許可する"
        arrow
        onClick={() => {
          handleEnableNotifications(user);
          navigate('/');
        }}
      />
    </div>
  );
};

export default NonNotification;
