import React from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { useSearchParams } from 'react-router-dom';

const REQUIRED_KEY = 'mvsat-seed-2025';

export default function SeedAssinaturas() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = React.useState('Executando seed...');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const run = async () => {
      try {
        const key = searchParams.get('k');
        if (key !== REQUIRED_KEY) {
          setError('Chave inválida.');
          return;
        }
        const db = getDb();

        // Apaga documentos existentes
        const snap = await getDocs(collection(db, 'assinaturas'));
        const batchDelete = writeBatch(db);
        snap.forEach(d => batchDelete.delete(doc(db, 'assinaturas', d.id)));
        await batchDelete.commit();

        // Insere novos documentos
        const items = [
          {
            id: '1526458038',
            plano: 'SKY TOP',
            status: 'ativa',
            codigo: '1526458038',
            nomeCompleto: 'Carlos Henrique de Souza Rosa',
            cpf: '941.376.922-20',
            rg: '4.800.595',
            dataNascimento: '1986-09-16',
            email: 'moisestimesky@gmail.com',
            telefone: '(91) 98245-4964',
            endereco: {
              estado: 'Piauí',
              cidade: 'Teresina',
              bairro: 'Buenos Aires',
              rua: 'José Marques da Rocha',
              numero: '3457',
              cep: '64009-185'
            }
          },
          {
            id: '1526445431',
            plano: 'SKY TOP',
            status: 'ativa',
            codigo: '1526445431',
            nomeCompleto: 'Regiane Pereira Correa',
            cpf: '044.639.722-99',
            rg: '7.903.542',
            dataNascimento: '1997-03-29',
            email: 'moisestimesky@gmail.com',
            telefone: '(91) 98245-4964',
            endereco: {
              estado: 'Pará',
              cidade: 'Moju',
              bairro: 'Paz',
              rua: 'Bar do Amigo',
              numero: '170',
              cep: '68450-000'
            }
          },
          {
            id: '1518532646',
            plano: 'SKY TOP',
            status: 'ativa',
            codigo: '1518532646',
            nomeCompleto: 'Regiane Pereira Correa',
            cpf: '044.639.722-99',
            rg: '7.903.542',
            dataNascimento: '1997-03-29',
            email: 'moisestimesky@gmail.com',
            telefone: '(91) 98245-4964',
            endereco: {
              estado: 'Pará',
              cidade: 'Abaetetuba',
              bairro: 'Bosque',
              rua: 'Bar do Amigo',
              numero: '169',
              cep: '68440-000'
            }
          },
          {
            id: '1521998638',
            plano: 'SKY TOP',
            status: 'ativa',
            codigo: '1521998638',
            nomeCompleto: 'Joana Darch Souza da Silva',
            cpf: '279.736.032-04',
            rg: '3.039.507',
            dataNascimento: '1957-02-10',
            email: 'moisestimesky@gmail.com',
            telefone: '(91) 98245-4964',
            endereco: {
              estado: 'Pará',
              cidade: 'Santa Isabel do Pará',
              bairro: 'Aratanha',
              rua: 'Travessa Petruceli',
              numero: '109',
              cep: '68790-000'
            }
          }
        ];

        const batchInsert = writeBatch(db);
        for (const it of items) {
          batchInsert.set(doc(db, 'assinaturas', it.id), it);
        }
        await batchInsert.commit();
        setMessage('Seed concluído com sucesso.');
      } catch (e: any) {
        setError(e?.message || 'Falha ao executar seed.');
      }
    };
    run();
  }, [searchParams]);

  if (error) return <div style={{ color: 'crimson' }}>{error}</div>;
  return <div>{message}</div>;
}



