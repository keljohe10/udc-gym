// usePaginatedFirestore.ts (versión alternativa usando skip lógico local y recarga completa por mes)
import {
  QueryConstraint,
  collection,
  query,
  orderBy,
  where,
  getDocs,
  getCountFromServer,
  DocumentData,
} from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';

interface UsePaginatedFirestoreProps {
  path: string;
  filters?: QueryConstraint[];
  orderByField: string;
  pageSize?: number;
}

export function usePaginatedFirestore<T = DocumentData>({
  path,
  filters = [],
  orderByField,
  pageSize = 20,
}: UsePaginatedFirestoreProps) {
  const [allData, setAllData] = useState<T[]>([]);
  const [paginatedData, setPaginatedData] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllDocs = async () => {
    setLoading(true);
    try {
      const colRef = collection(db, path);
      const fullQuery = query(colRef, ...filters, orderBy(orderByField, 'desc'));
      const snapshot = await getDocs(fullQuery);
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
      setAllData(docs);
      setTotalDocs(docs.length);
      setPage(0);
      setPaginatedData(docs.slice(0, pageSize));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(filters)]);

  const goToPage = (newPage: number) => {
    const start = newPage * pageSize;
    const end = start + pageSize;
    setPage(newPage);
    setPaginatedData(allData.slice(start, end));
  };

  return {
    data: paginatedData,
    loading,
    error,
    totalDocs,
    page,
    pageSize,
    nextPage: () => goToPage(page + 1),
    prevPage: () => goToPage(Math.max(0, page - 1)),
    goToPage,
  };
}