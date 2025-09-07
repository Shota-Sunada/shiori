import { useState, useEffect } from 'react';
import Button from '../components/Button';
import { SERVER_ENDPOINT } from '../App';
import { useAuth } from '../auth-context';

interface Credit {
  category: string;
  items: string;
}

const Credits = () => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/credits`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Credit[] = await response.json();
        setCredits(data);
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCredits();
    }
  }, [token]);

  if (loading || !credits) {
    return (
      <div className="flex flex-col items-center justify-center m-[10px] text-center">
        <p>{'読み込み中...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center m-[10px] text-center">
        <p>エラー: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center m-[10px] text-center">
      <p className="text-xl font-bold">{'クレジット'}</p>
      {credits.map((credit, index) => (
        <div key={index} className="m-2">
          <p className="font-bold">{credit.category}</p>
          {credit.items.split(",").map((item, itemIndex) => (
            <p key={itemIndex}>
              {item}
            </p>
          ))}
        </div>
      ))}
      <Button text="ホームに戻る" arrowLeft link="/index"></Button>
    </div>
  );
};

export default Credits;
