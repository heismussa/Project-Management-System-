import React from 'react';
import { useDocuments } from '../hooks/useDocuments';

export default function DocumentsPage() {
  const { data: documents, isLoading, isError, error } = useDocuments();

  if (isLoading) return <div className="p-6 text-gray-600">Loading documents...</div>;
  if (isError) return <div className="p-6 text-red-500">Error: {error.message}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Project Documents</h1>
      
      {documents?.length === 0 ? (
        <div className="p-4 bg-gray-50 border rounded-lg text-gray-500">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {documents?.map((doc) => (
            <div key={doc.id} className="p-4 border rounded-lg bg-white flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-800">{doc.name}</p>
                <p className="text-xs text-gray-500">{doc.size || 'Unknown size'}</p>
              </div>
              <a 
                href={doc.url} 
                target="_blank" 
                rel="noreferrer" 
                className="text-sm text-blue-600 hover:underline"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}