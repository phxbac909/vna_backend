// proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAndRefreshSession } from '@/lib/database';

console.log('🚀 Proxy loaded! Server time:', new Date().toISOString());

// Public patterns - không cần auth
const PUBLIC_PATTERNS = [
  /^\/$/,                           // Root path
  /^\/login$/,                      // Login page
  /^\/api\/auth\/(login|logout)$/,  // Login/Logout API
];

// Helper để thêm CORS headers
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-username');
  return response;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  
  console.log(`🌐 [PROXY] ${method} ${pathname}`);
  
  // Handle OPTIONS (preflight)
  if (method === 'OPTIONS') {
    console.log(`🔄 [PROXY] Preflight request`);
    return addCorsHeaders(new NextResponse(null, { status: 200 }));
  }
  
  // Check public patterns
  const isPublic = PUBLIC_PATTERNS.some(pattern => pattern.test(pathname));
  
  if (isPublic) {
    console.log(`✅ [PROXY] Public route: ${pathname}`);
    return addCorsHeaders(NextResponse.next());
  }
  
  // Protected routes - cần auth
  if (pathname.startsWith('/api/')) {
    console.log(`🔐 [PROXY] Protected API route: ${pathname}`);
    
    const username = request.headers.get('x-username');
    console.log(`👤 [PROXY] Username header: "${username}"`);
    
    // Kiểm tra có username không
    if (!username) {
      console.log(`❌ [PROXY] Blocking: No username header`);
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            message: 'Authentication required. Please add x-username header.',
            code: 'UNAUTHORIZED',
            path: pathname
          },
          { status: 401 }
        )
      );
    }
    
    // Kiểm tra session có hợp lệ không
    const sessionCheck = checkAndRefreshSession(username);
    
    if (!sessionCheck.valid) {
      console.log(`❌ [PROXY] Session expired for user: ${username}`);
      return addCorsHeaders(
        NextResponse.json(
          {
            success: false,
            message: 'Session expired. Please login again.',
            code: 'SESSION_EXPIRED',
            path: pathname
          },
          { status: 401 }
        )
      );
    }
    
    console.log(`✅ [PROXY] Session valid for user: ${username}, expires at: ${sessionCheck.expiresAt}`);
    
    // Cho phép request đi tiếp
    const response = NextResponse.next();
    
    // Thêm debug headers
    response.headers.set('x-proxy-processed', 'true');
    response.headers.set('x-proxy-timestamp', new Date().toISOString());
    response.headers.set('x-proxy-username', username);
    response.headers.set('x-session-expires', sessionCheck.expiresAt || '');
    
    return addCorsHeaders(response);
  }
  
  // Other routes (pages, static files, etc.)
  console.log(`➡️ [PROXY] Other route: ${pathname}`);
  return NextResponse.next();
}

// Cấu hình matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};