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
  const groupOptions = useMemo(() => {
    const sortedGroups = [...rollCallGroups].sort((a, b) => a.id - b.id);
    return sortedGroups.map((g) => (
      <option key={g.id} value={g.name}>
        {g.name}
      </option>
    ));
  }, [rollCallGroups]);

  return (
    <div>
      <label htmlFor="target_students" className="block text-gray-700 text-sm font-bold">
        {'送信先を選択'}
      </label>
      <select
        name="target_students"
        id="target_students"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
        className="w-full! p-3! m-0! border! border-blue-300! rounded-lg! focus:outline-none! focus:ring-2! focus:ring-blue-400! text-base! bg-blue-50! placeholder-gray-400! transition!">
        <option value="default">{'【送信先を選択してください】'}</option>
        <option value="all">{'全員'}</option>
        {groupOptions}
      </select>
    </div>
  );
};

export default StudentPresetSelector;
