import { useParams } from 'react-router-dom';
export default function SemanaDetalle() {
  const { id } = useParams<{ id: string }>();
  return <div className="p-6"><h1 className="text-2xl font-bold text-navy">Semana {id}</h1></div>;
}
