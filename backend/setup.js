const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'devflow_db',
  port: process.env.DB_PORT || 3306
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔧 Setting up Devflow database...');
    
    // Connect without database first to create it if needed
    const { database, ...configWithoutDb } = dbConfig;
    connection = await mysql.createConnection(configWithoutDb);
    
    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${database}`);
    console.log(`✅ Database '${database}' created/verified`);
    
    // Switch to the database
    await connection.execute(`USE ${database}`);
    
    // Create tables
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS squads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3B82F6',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Squads table created');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        role VARCHAR(100),
        avatar_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Team members table created');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS squad_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        squad_id INT NOT NULL,
        member_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES team_members(id) ON DELETE CASCADE,
        UNIQUE KEY unique_squad_member (squad_id, member_id)
      )
    `);
    console.log('✅ Squad assignments table created');

    // Insert sample data
    const sampleSquads = [
      { name: 'Frontend Team', description: 'React and Angular developers', color: '#3B82F6' },
      { name: 'Backend Team', description: 'Node.js and Python developers', color: '#10B981' },
      { name: 'DevOps Team', description: 'Infrastructure and deployment', color: '#F59E0B' },
      { name: 'QA Team', description: 'Testing and quality assurance', color: '#EF4444' }
    ];

    for (const squad of sampleSquads) {
      await connection.execute(`
        INSERT IGNORE INTO squads (name, description, color)
        VALUES (?, ?, ?)
      `, [squad.name, squad.description, squad.color]);
    }
    console.log('✅ Sample squads created');

    const sampleMembers = [
      { name: 'John Doe', email: 'john@devflow.com', role: 'Senior Frontend Developer' },
      { name: 'Jane Smith', email: 'jane@devflow.com', role: 'Backend Developer' },
      { name: 'Mike Johnson', email: 'mike@devflow.com', role: 'DevOps Engineer' },
      { name: 'Sarah Wilson', email: 'sarah@devflow.com', role: 'QA Engineer' },
      { name: 'Alex Brown', email: 'alex@devflow.com', role: 'Full Stack Developer' },
      { name: 'Emily Davis', email: 'emily@devflow.com', role: 'UI/UX Designer' }
    ];

    for (const member of sampleMembers) {
      await connection.execute(`
        INSERT IGNORE INTO team_members (name, email, role)
        VALUES (?, ?, ?)
      `, [member.name, member.email, member.role]);
    }
    console.log('✅ Sample team members created');

    // Assign some members to squads
    const assignments = [
      { member_name: 'John Doe', squad_name: 'Frontend Team' },
      { member_name: 'Jane Smith', squad_name: 'Backend Team' },
      { member_name: 'Mike Johnson', squad_name: 'DevOps Team' },
      { member_name: 'Sarah Wilson', squad_name: 'QA Team' },
      { member_name: 'Alex Brown', squad_name: 'Frontend Team' },
      { member_name: 'Emily Davis', squad_name: 'Frontend Team' }
    ];

    for (const assignment of assignments) {
      await connection.execute(`
        INSERT IGNORE INTO squad_assignments (squad_id, member_id)
        SELECT s.id, m.id
        FROM squads s, team_members m
        WHERE s.name = ? AND m.name = ?
      `, [assignment.squad_name, assignment.member_name]);
    }
    console.log('✅ Sample squad assignments created');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📊 Sample data created:');
    console.log('- 4 squads (Frontend, Backend, DevOps, QA)');
    console.log('- 6 team members');
    console.log('- 6 squad assignments');
    
    console.log('\n🚀 You can now start the server with:');
    console.log('   npm run dev');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase }; 