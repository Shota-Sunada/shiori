import Button from "../components/Button";

const Credits = () => {
  return (
    <div className="flex flex-col items-center justify-center m-[10px] text-center">
      <p className="text-xl font-bold">{'クレジット'}</p>
      <div className="m-2">
        <p className="font-bold">{'企画・原案'}</p>
        <p>{'野上知宏'}</p>
      </div>
      <div className="m-2">
        <p className="font-bold">{'開発'}</p>
        <p>{'砂田翔太'}</p>
      </div>
      <div className="m-2">
        <p className="font-bold">{'開発協力'}</p>
        <p>{'町一誠'}</p>
        <p>{'藤島真介'}</p>
      </div>
      <div className="m-2">
        <p className="font-bold">{'デバッグ協力'}</p>
        <p>{'川井大和'}</p>
        <p>{'武田啓成'}</p>
        <p>{'永末翔太'}</p>
        <p>{'和氣巧弥'}</p>
        <p>{'野間大生樹'}</p>
        <p>{'福井隆輔'}</p>
        <p>{'藤川和樹'}</p>
        <p>{'山田和陽'}</p>
      </div>
      <div className="m-2">
        <p className="font-bold">{'協力'}</p>
        <p className="text-sm">{'お楽しみ会実行委員'}</p>
        <p>{'砂田翔太'}</p>
        <p>{'野間大生樹'}</p>
        <p>{'藤岡大颯'}</p>
        <p>{'藤村英輝'}</p>
      </div>
      <div className="m-2">
        <p className="font-bold">{'サーバー提供'}</p>
        <p>{'株式会社Urth'}</p>
      </div>
      <div className="m-2">
        <p className="font-bold">{'ドメイン提供'}</p>
        <p>{'修道物理班'}</p>
      </div>
      <Button text="ホームに戻る" arrowLeft link="/index"></Button>
    </div>
  );
};

export default Credits;
