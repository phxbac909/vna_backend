// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkSessionOnly } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Lấy username từ query parameter
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json(
        {
          success: false,
          message: 'Thiếu username',
          code: 'MISSING_USERNAME'
        },
        { status: 400 }
      );
    }

    // Chỉ kiểm tra, không refresh
    const isValid = checkSessionOnly(username);

    return NextResponse.json(
      {
        success: true,
        message: isValid ? 'Session còn hiệu lực' : 'Session đã hết hạn',
        code: isValid ? 'SESSION_VALID' : 'SESSION_EXPIRED',
        data: { valid: isValid }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Check session error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi server',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}