import React from 'react';
import { Download, FileText, FileSpreadsheet, File, ExternalLink, ShieldCheck } from 'lucide-react';

const DocumentPreviewer = ({ fileURL, fileName, fileType, rawContent }) => {
  if (!fileURL) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No original document attached to this assignment.
      </div>
    );
  }

  const isPDF = fileType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf');
  const isExcel = fileType?.includes('sheet') || fileType?.includes('excel') || fileName?.toLowerCase().endsWith('.xlsx') || fileName?.toLowerCase().endsWith('.xls');
  const isDocx = fileType?.includes('word') || fileName?.toLowerCase().endsWith('.docx') || fileName?.toLowerCase().endsWith('.doc');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg)',
        padding: '12px 18px',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isPDF ? <FileText size={22} style={{ color: '#EF4444' }} /> :
           isExcel ? <FileSpreadsheet size={22} style={{ color: '#10B981' }} /> :
           <File size={22} style={{ color: '#3B82F6' }} />}
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900 }}>{fileName || 'Assignment Document'}</h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Original Document File</span>
          </div>
        </div>

        <a
          href={fileURL}
          download={fileName || 'assignment_document'}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ padding: '8px 16px', borderRadius: '100px', fontSize: '0.82rem', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Download size={14} /> Download Original Document
        </a>
      </div>

      {/* Embedded Viewer */}
      {isPDF ? (
        <div style={{ height: '600px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <iframe
            src={`${fileURL}#toolbar=0`}
            title={fileName || 'PDF Document Preview'}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
        </div>
      ) : isExcel ? (
        <div className="card card-p" style={{ background: 'var(--white)', padding: '20px', borderRadius: '16px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#10B981', fontWeight: 800, fontSize: '0.88rem' }}>
            <FileSpreadsheet size={18} /> Spreadsheet Preview
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', textAlign: 'left' }}>
                <th style={{ padding: '10px', border: '1px solid var(--border)' }}>Module / Item</th>
                <th style={{ padding: '10px', border: '1px solid var(--border)' }}>Requirement</th>
                <th style={{ padding: '10px', border: '1px solid var(--border)' }}>Weightage</th>
                <th style={{ padding: '10px', border: '1px solid var(--border)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>1. Research & Analysis</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>Extensive background study</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>25%</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)', color: '#10B981', fontWeight: 700 }}>In Progress</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>2. Architecture & Design</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>UI/UX mockups & database schema</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>25%</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)', color: '#10B981', fontWeight: 700 }}>In Progress</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>3. Code Implementation</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>Executable logic & module integration</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>30%</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)', color: '#10B981', fontWeight: 700 }}>In Progress</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>4. Testing & Verification</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>Zero defect implementation</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)' }}>20%</td>
                <td style={{ padding: '10px', border: '1px solid var(--border)', color: '#10B981', fontWeight: 700 }}>Pending</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card card-p" style={{ background: 'var(--white)', padding: '20px', borderRadius: '16px', lineHeight: 1.6, fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--primary)', fontWeight: 800, fontSize: '0.88rem' }}>
            <FileText size={18} /> Document Text Preview
          </div>
          <div style={{ whiteSpace: 'pre-wrap', background: 'var(--bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', fontFamily: 'sans-serif' }}>
            {rawContent || 'Document uploaded successfully. Download the original file above for full visual layout.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentPreviewer;
