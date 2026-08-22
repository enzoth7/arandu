const fs = require('fs');

const files = [
  'app/api/institutional/representation-claims/route.ts',
  'app/api/team/admin/representations/route.ts',
  'lib/facility-registry.ts',
  'lib/visit-scheduling-db.ts',
  'app/components/AccountAccess.tsx',
  'app/components/institutional/RoleWorkflowForms.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // The corruption happens when UTF-8 bytes are interpreted as Windows-1252/latin1,
  // and then encoded to UTF-8 again.
  // So we decode UTF-8 back to latin1 bytes, then decode those bytes as UTF-8.
  
  try {
    const bytes = Buffer.from(content, 'utf8').toString('latin1');
    const fixed = Buffer.from(bytes, 'binary').toString('utf8');
    
    // Check if fixed makes sense (e.g. contains "Ã")
    if (!fixed.includes('Ã')) {
       fs.writeFileSync(file, fixed, 'utf8');
       console.log("Fixed " + file);
    } else {
       console.log("Not fixed completely? " + file);
       
       // Fallback manual replacement for common chars if latin1 trick fails
       let manual = content
         .replace(/Ã¡/g, 'á')
         .replace(/Ã©/g, 'é')
         .replace(/Ã­/g, 'í')
         .replace(/Ã³/g, 'ó')
         .replace(/Ãº/g, 'ú')
         .replace(/Ã±/g, 'ñ')
         .replace(/Ã/g, 'Á')
         .replace(/Ã‰/g, 'É')
         .replace(/Ã/g, 'Í')
         .replace(/Ã“/g, 'Ó')
         .replace(/Ãš/g, 'Ú')
         .replace(/Ã‘/g, 'Ñ')
         .replace(/â€œ/g, '"')
         .replace(/â€/g, '"')
         .replace(/â€¦/g, '…')
         .replace(/Â·/g, '·')
         .replace(/ÃƒÂ³/g, 'ó')
         .replace(/ÃƒÂ©/g, 'é')
         .replace(/ÃƒÂ¡/g, 'á')
         .replace(/ÃƒÂ­/g, 'í')
         .replace(/ÃƒÂ±/g, 'ñ');
       fs.writeFileSync(file, manual, 'utf8');
       console.log("Manual fixed " + file);
    }
  } catch (err) {
     console.error("Error on " + file, err);
  }
}
