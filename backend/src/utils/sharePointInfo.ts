/**
 * SharePoint URL에서 정보 추출 유틸리티
 */

export interface SharePointInfo {
  tenant: string;
  siteName: string;
  fileIdPartial: string;
  siteId?: string;
  driveId?: string;
  fileId?: string;
}

/**
 * SharePoint URL 파싱
 */
export function parseSharePointUrl(url: string): SharePointInfo {
  // https://ajgroup365.sharepoint.com/:x:/s/portal2/IQD4tiji77DRRohZsHYtvbufAdXNWCZUW3NRiu4xTEZgV60?e=CC8C51
  const match = url.match(/https:\/\/([^/]+)\.sharepoint\.com\/:x:\/s\/([^/]+)\/([^?]+)/);
  
  if (!match) {
    throw new Error('Invalid SharePoint URL format');
  }

  return {
    tenant: match[1],
    siteName: match[2],
    fileIdPartial: match[3],
  };
}

/**
 * Graph API를 사용하여 Site ID 조회
 */
export async function getSiteId(tenant: string, siteName: string, accessToken: string): Promise<string> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${tenant}.sharepoint.com:/sites/${siteName}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get site ID: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Graph API를 사용하여 Drive ID 조회
 */
export async function getDriveId(siteId: string, accessToken: string): Promise<string> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get drive ID: ${response.statusText}`);
  }

  const data = await response.json();
  
  // 보통 첫 번째 드라이브 (Documents) 사용
  if (data.value && data.value.length > 0) {
    return data.value[0].id;
  }
  
  throw new Error('No drives found');
}

/**
 * Graph API를 사용하여 File ID 조회
 */
export async function getFileId(
  siteId: string,
  driveId: string,
  fileName: string,
  accessToken: string
): Promise<string> {
  // 파일 이름으로 검색
  const searchResponse = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/search(q='${encodeURIComponent(fileName)}')`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    if (searchData.value && searchData.value.length > 0) {
      return searchData.value[0].id;
    }
  }

  // 검색 실패 시 모든 파일 목록에서 찾기
  const listResponse = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/children`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!listResponse.ok) {
    throw new Error(`Failed to list files: ${listResponse.statusText}`);
  }

  const listData = await listResponse.json();
  const file = listData.value?.find((f: any) => 
    f.name.toLowerCase().includes(fileName.toLowerCase()) ||
    f.name.toLowerCase().includes('면접') ||
    f.name.toLowerCase().includes('interview')
  );

  if (file) {
    return file.id;
  }

  throw new Error(`File not found: ${fileName}`);
}

/**
 * SharePoint URL에서 모든 정보 자동 추출
 */
export async function extractSharePointInfo(
  url: string,
  accessToken: string,
  fileName: string = 'AJ_Networks_면접_자동화.xlsx'
): Promise<{
  siteId: string;
  driveId: string;
  fileId: string;
}> {
  const parsed = parseSharePointUrl(url);
  
  const siteId = await getSiteId(parsed.tenant, parsed.siteName, accessToken);
  const driveId = await getDriveId(siteId, accessToken);
  const fileId = await getFileId(siteId, driveId, fileName, accessToken);

  return {
    siteId,
    driveId,
    fileId,
  };
}
