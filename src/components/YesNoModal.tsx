const YesNoModal = (props: { message: string; yes: () => void; no: () => void }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="border-[1px] bg-white text-black rounded-xl px-[5dvw] py-[5dvh]">
        <p>{props.message}</p>
        <div className="flex flex-row items-center justify-center">
          <p
            className="cursor-pointer m-[5px] bg-red-400 text-white rounded-2xl p-[10px] min-w-[5dvw] text-center"
            onClick={() => {
              props.yes();
            }}>
            {'はい'}
          </p>
          <p
            className="cursor-pointer m-[5px] bg-white-400 border-black border-[1px] text-black rounded-2xl p-[10px] min-w-[5dvw] text-center"
            onClick={() => {
              props.no();
            }}>
            {'いいえ'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default YesNoModal;
