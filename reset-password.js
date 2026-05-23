const bcrypt = require('bcryptjs');
const { getDb, initDatabase } = require('./database');

async function resetPassword() {
    try {
        const db = await initDatabase();
        
        // 生成新密码的哈希值
        const newPassword = 'len115599';
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        await db.read();
        
        // 查找admin用户
        const adminUser = db.data.users.find(u => u.username === 'admin');
        
        if (!adminUser) {
            console.log('admin用户不存在');
            return;
        }
        
        // 更新密码
        adminUser.password = hashedPassword;
        adminUser.password_updated_at = new Date().toISOString();
        
        await db.write();
        
        console.log('密码重置成功！');
        console.log('新密码：len115599');
        console.log('密码哈希：', hashedPassword);
        
    } catch (error) {
        console.error('密码重置失败：', error);
    }
}

resetPassword();
