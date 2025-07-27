import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import type { student } from '../data/students';

const Index = () => {
  const { user, loading } = useAuth();

  const navigate = useNavigate();

  const [studentData, setStudentData] = useState<student | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      if (user && user.email) {
        const gakuseki = user.email.split('@')[0];
        const db = getFirestore();
        const q = query(collection(db, 'students'), where('gakuseki', '==', Number(gakuseki)));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setStudentData(snapshot.docs[0].data() as student);
        } else {
          setStudentData(null);
        }
      }
    };

    fetchStudent();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading)
    return (
      <div>
        <p>{'読込中...'}</p>
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center pt-[20dvh]">
      <p>
        {"ようこそ、"}{studentData?.surname}{studentData?.forename}{"さん。"}
        </p>
    </div>
  );
};

export default Index;
