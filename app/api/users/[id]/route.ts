import { NextRequest, NextResponse } from 'next/server';
import { deleteUser, findUserById, getAllUsers } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
 { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const { id } = await params;
    
    // Kiểm tra user có tồn tại không
    const user = findUserById(id);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User không tồn tại',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }
    
    // Xóa user
    const isDeleted = deleteUser(id);
    
    if (isDeleted) {
      return NextResponse.json(
        {
          success: true,
          message: 'Xóa user thành công',
          code: 'SUCCESS'
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Không thể xóa user',
          code: 'DELETE_FAILED'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Delete user error:', error);
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

// Thêm GET method để test
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const user = findUserById(id);
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User không tồn tại',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }
    
    // Loại bỏ password
    const { password, ...safeUser } = user;
    
    return NextResponse.json(
      {
        success: true,
        message: 'Lấy user thành công',
        code: 'SUCCESS',
        data: safeUser
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get user error:', error);
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
      'Access-Control-Allow-Methods': 'DELETE, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}