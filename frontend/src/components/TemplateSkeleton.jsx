import React from 'react';
import { Skeleton } from '@vibe/core';

const TemplateSkeleton = ({ rows = 5 }) => {
  return (
    <>
      {[...Array(rows)].map((_, index) => (
        <tr key={`skeleton-${index}`} style={{ borderBottom: '1px solid #f8f9fa' }}>
          {/* NAME Column */}
          <td style={{ padding: '16px 24px' }}>
            <Skeleton width="120px" height="18px" />
          </td>
          {/* SUBJECT Column */}
          <td style={{ padding: '16px 24px' }}>
            <Skeleton width="180px" height="18px" />
          </td>
          {/* CONTENT Column */}
          <td style={{ padding: '16px 24px' }}>
            <Skeleton width="100px" height="18px" />
          </td>
          {/* TYPE Column */}
          <td style={{ padding: '16px 24px' }}>
            <Skeleton width="60px" height="24px" borderRadius="4px" />
          </td>
          {/* OWNER Column */}
          <td style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Skeleton type="circle" width="24px" height="24px" />
            </div>
          </td>
          {/* CREATED Column */}
          <td style={{ padding: '16px 24px' }}>
            <Skeleton width="70px" height="18px" />
          </td>
          {/* ACTION Column */}
          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Skeleton width="24px" height="24px" />
              <Skeleton width="24px" height="24px" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

export default TemplateSkeleton;
