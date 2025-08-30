import { useRef } from 'react';
import { sha256 } from '../sha256';

const SHA256 = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="m-[10px] flex flex-col">
      <h2>{'SHA256生成ツール'}</h2>
      <div>
        <label htmlFor="input">{'入力'}</label>
        <input ref={inputRef} className="m-[10px] border p-2 rounded" type="text" name="input" id="input" />
        <button
          className="m-[10px] border p-2 rounded cursor-pointer"
          type="button"
          onClick={async () => {
            const hash = await sha256(inputRef.current?.value ?? '');
            outputRef.current?.setAttribute('value', hash);
          }}>
          {'生成'}
        </button>
      </div>
      <div>
        <label htmlFor="output">{'出力'}</label>
        <input ref={outputRef} className="m-[10px] border p-2 rounded" type="text" name="output" id="output" readOnly />
      </div>
    </div>
  );
};

export default SHA256;
