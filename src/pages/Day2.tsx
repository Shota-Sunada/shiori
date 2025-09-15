import React, { useEffect, useState } from 'react';
import { studentApi, type StudentDTO } from '../helpers/domainApi';
import  { BackToHome } from '../components/MDButton';
import { useAuth } from '../auth-context';

const Day2: React.FC = () => {
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    studentApi
      .list()
      .then((data: StudentDTO[]) => {
        setStudents(data);
        setLoading(false);
      })
      .catch(() => {
        setError('生徒データの取得に失敗しました');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4 text-center">読込中...</div>;
  if (error) return <div className="p-4 text-red-500 text-center">{error}</div>;
  if (!students.length) return <div className="p-4 text-center">生徒データがありません</div>;

  // classごとにグループ化
  const classMap: Record<number, StudentDTO[]> = {};
  students.forEach((s) => {
    if (!classMap[s.class]) classMap[s.class] = [];
    classMap[s.class].push(s);
  });

  // 各classごとにテーブルを作成
  return (
    <div className="p-4 space-y-8">
      {Object.entries(classMap).map(([classNum, classStudents]) => {
        // day2numごとに班員・班長をグループ化
        const byDay2num: Record<number, { leader?: StudentDTO; members: StudentDTO[] }> = {};
        classStudents.forEach((s) => {
          if (s.day2num >= 10) {
            // 10で割った値が班番号
            const groupNum = Math.floor(s.day2num / 10);
            if (!byDay2num[groupNum]) byDay2num[groupNum] = { members: [] };
            byDay2num[groupNum].leader = s;
          } else {
            if (!byDay2num[s.day2num]) byDay2num[s.day2num] = { members: [] };
            byDay2num[s.day2num].members.push(s);
          }
        });
        // 各班の最大班員数を取得し、列ごとにデータが存在するか判定
        const sortedDay2nums = Object.keys(byDay2num)
          .map(Number)
          .filter((n) => n >= 1 && n <= 8)
          .sort((a, b) => a - b);
        // 各班の班員数を取得
        const memberCounts = sortedDay2nums.map((num) => byDay2num[num]?.members?.length ?? 0);
        // 最大班員数
        const maxMembers = Math.max(0, ...memberCounts);
        // 各列（0:班長, 1~maxMembers:班員）でデータが存在するか判定
        const showLeaderCol = sortedDay2nums.some((num) => !!byDay2num[num]?.leader);
        const showMemberCols: boolean[] = [];
        for (let i = 0; i < maxMembers; i++) {
          showMemberCols[i] = sortedDay2nums.some((num) => !!byDay2num[num]?.members[i]);
        }
        return (
          <div key={classNum} className='flex flex-col items-center justify-center'>
            <h2 className="text-lg font-bold mb-2">{classNum}組</h2>
            <div className="overflow-x-auto rounded-lg shadow-lg border border-gray-200 bg-gradient-to-br from-white to-blue-50">
              <table className="min-w-max w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border-b-2 border-blue-200 bg-blue-100 text-blue-900 font-semibold text-center rounded-tl-lg">班番号</th>
                    {showLeaderCol && <th className="px-4 py-2 border-b-2 border-blue-200 bg-blue-100 text-blue-900 font-semibold text-center">班長</th>}
                    {showMemberCols.map((show, i) =>
                      show ? (
                        <th
                          key={`member-header-${i}`}
                          className={'px-4 py-2 border-b-2 border-blue-200 bg-blue-100 text-blue-900 font-semibold text-center' + (i === showMemberCols.length - 1 ? ' rounded-tr-lg' : '')}>
                          班員
                        </th>
                      ) : null
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedDay2nums.map((num, rowIdx) => {
                    const group = byDay2num[num];
                    // データが全くない場合は行を表示しない
                    const hasLeader = !!group.leader;
                    const hasMembers = group.members && group.members.length > 0;
                    if (!hasLeader && !hasMembers) return null;
                    // 班員をカタカナ順でソート
                    const sortedMembers = group.members.slice().sort((a, b) => {
                      const aKana = a.surname_kana + a.forename_kana;
                      const bKana = b.surname_kana + b.forename_kana;
                      return aKana.localeCompare(bKana, 'ja');
                    });
                    return (
                      <tr key={num} className={rowIdx % 2 === 0 ? 'bg-white hover:bg-blue-50 transition-colors' : 'bg-blue-50 hover:bg-blue-100 transition-colors'}>
                        <td className="px-4 py-2 border-b border-blue-100 font-bold text-center bg-blue-50 sticky left-0 z-10">{num}</td>
                        {showLeaderCol && (
                          <td
                            key={group.leader ? group.leader.gakuseki : 'empty-leader'}
                            className={'px-4 py-2 border-b border-r border-blue-100 text-center font-bold ' + (group.leader ? 'text-blue-700 bg-blue-50' : 'text-gray-300 bg-gray-50')}>
                            {group.leader ? `${group.leader.surname}${group.leader.forename}` : '-'}
                          </td>
                        )}
                        {showMemberCols.map((show, i) => {
                          if (!show) return null;
                          const s = sortedMembers[i];
                          return (
                            <td
                              key={s ? s.gakuseki : `empty-member-${i}`}
                              className={
                                'px-4 py-2 border-b border-r border-blue-100 text-center ' + (!s ? 'text-gray-300 bg-gray-50' : '') + (i === showMemberCols.length - 1 ? ' rounded-tr-lg' : '')
                              }>
                              {s ? `${s.surname}${s.forename}` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <BackToHome user={user} />
          </div>
        );
      })}
    </div>
  );
};

export default Day2;
