import { useMemo } from 'react';

export interface RollCallGroup {
  id: number;
  name: string;
  student_ids: number[];
}

export interface StudentPresetSelectorProps {
  value: string;
  onChange: (value: string) => void;
  rollCallGroups: RollCallGroup[];
  disabled?: boolean;
}

const StudentPresetSelector = ({ value, onChange, rollCallGroups, disabled }: StudentPresetSelectorProps) => {
  const groupOptions = useMemo(
    () =>
      rollCallGroups.map((g) => (
        <option key={g.id} value={g.name}>
          {g.name}
        </option>
      )),
    [rollCallGroups]
  );

  return (
    <div className="mb-4">
      <label htmlFor="target_students" className="block text-gray-700 text-sm font-bold mb-2">
        {'プリセットを選択'}
      </label>
      <select
        name="target_students"
        id="target_students"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white">
        <option value="default">{'選択してください'}</option>
        <option value="all">{'【取扱注意】全員'}</option>
        {groupOptions}
      </select>
    </div>
  );
};

export default StudentPresetSelector;
