require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

const CATEGORIES = [
  'Salary','Freelance','Business Income','Investments','Rental Income',
  'Food & Dining','Rent','Utilities','Healthcare','Entertainment',
  'Travel','Shopping','Education','Fuel','EMI / Loans','Insurance',
  'Groceries','Personal Care','Subscriptions','Misc'
];

const USERS = [
  { name:'Arjun Mehta',    email:'admin@finance.dev',        password:'Admin123!',   role:'admin'   },
  { name:'Priya Sharma',   email:'priya.sharma@finance.dev', password:'Admin123!',   role:'admin'   },
  { name:'Rohan Iyer',     email:'analyst@finance.dev',      password:'Analyst123!', role:'analyst' },
  { name:'Kavya Nair',     email:'kavya.nair@finance.dev',   password:'Analyst123!', role:'analyst' },
  { name:'Vikram Bose',    email:'vikram.bose@finance.dev',  password:'Analyst123!', role:'analyst' },
  { name:'Ananya Pillai',  email:'viewer@finance.dev',       password:'Viewer123!',  role:'viewer'  },
  { name:'Siddharth Rao',  email:'sid.rao@finance.dev',      password:'Viewer123!',  role:'viewer'  },
  { name:'Meera Krishnan', email:'meera.k@finance.dev',      password:'Viewer123!',  role:'viewer'  },
  { name:'Aditya Joshi',   email:'aditya.j@finance.dev',     password:'Viewer123!',  role:'viewer'  },
  { name:'Pooja Desai',    email:'pooja.d@finance.dev',      password:'Viewer123!',  role:'viewer'  },
  { name:'Karthik Suresh', email:'karthik.s@finance.dev',    password:'Viewer123!',  role:'viewer'  },
  { name:'Sneha Patel',    email:'sneha.p@finance.dev',      password:'Viewer123!',  role:'viewer'  },
  { name:'Rahul Gupta',    email:'rahul.g@finance.dev',      password:'Viewer123!',  role:'viewer'  },
  { name:'Ishaan Chopra',  email:'ishaan.c@finance.dev',     password:'Viewer123!',  role:'viewer'  },
  { name:'Nandita Verma',  email:'nandita.v@finance.dev',    password:'Viewer123!',  role:'viewer'  },
];

function rnd(min,max){return Math.round((Math.random()*(max-min)+min)*100)/100;}
function dateAt(monthsAgo,day){const d=new Date();d.setMonth(d.getMonth()-monthsAgo);d.setDate(day||Math.floor(Math.random()*27)+1);return d.toISOString().split('T')[0];}

function seed(){
  const db=getDb();
  console.log('Seeding enhanced database...');
  db.exec('DELETE FROM refresh_tokens;DELETE FROM transactions;DELETE FROM users;DELETE FROM categories;');

  for(const c of CATEGORIES) db.prepare('INSERT INTO categories(name) VALUES(?)').run(c);
  const catMap=Object.fromEntries(db.prepare('SELECT id,name FROM categories').all().map(c=>[c.name,c.id]));
  console.log('  categories done');

  for(const u of USERS) db.prepare('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)').run(u.name,u.email,bcrypt.hashSync(u.password,10),u.role);
  console.log('  users done: '+USERS.length);

  const uid=db.prepare("SELECT id FROM users WHERE email='admin@finance.dev'").get().id;
  const ins=db.prepare('INSERT INTO transactions(user_id,amount,type,category_id,date,notes) VALUES(?,?,?,?,?,?)');

  const fill=db.transaction(()=>{
    for(let m=0;m<12;m++){
      ins.run(uid,85000,'income',catMap['Salary'],dateAt(m,1),'Salary credit — HDFC Bank');
      ins.run(uid,22000,'income',catMap['Rental Income'],dateAt(m,5),'Flat rent — Koramangala 2BHK');
      ins.run(uid,28000,'expense',catMap['Rent'],dateAt(m,3),'Monthly flat rent — HSR Layout');
      ins.run(uid,22500,'expense',catMap['EMI / Loans'],dateAt(m,2),'SBI Home Loan EMI');
      if(m%3===0) ins.run(uid,8500,'expense',catMap['Insurance'],dateAt(m,10),'HDFC Life term plan premium');
      for(let i=0;i<Math.floor(rnd(8,15));i++) ins.run(uid,rnd(350,2500),'expense',catMap['Food & Dining'],dateAt(m),['Zomato order','Swiggy dinner','Barbeque Nation','Cafe Coffee Day','Restaurant bill'][Math.floor(Math.random()*5)]);
      for(let i=0;i<3;i++) ins.run(uid,rnd(1800,4200),'expense',catMap['Groceries'],dateAt(m),['BigBasket','D-Mart','Blinkit'][i]);
      ins.run(uid,rnd(800,2200),'expense',catMap['Utilities'],dateAt(m),['BESCOM electricity','Jio fiber','BWSSB water'][Math.floor(Math.random()*3)]);
      ins.run(uid,rnd(1800,4500),'expense',catMap['Fuel'],dateAt(m),'HP petrol pump');
      ins.run(uid,rnd(299,1499),'expense',catMap['Subscriptions'],dateAt(m),['Netflix','Hotstar','Spotify','Amazon Prime'][Math.floor(Math.random()*4)]);
      ins.run(uid,rnd(500,2000),'expense',catMap['Personal Care'],dateAt(m),'Salon / grooming');
      ins.run(uid,rnd(800,3500),'expense',catMap['Entertainment'],dateAt(m),['PVR weekend','BookMyShow','Event tickets'][Math.floor(Math.random()*3)]);
      if(Math.random()>0.4) ins.run(uid,rnd(1500,15000),'expense',catMap['Travel'],dateAt(m),['IndiGo flight','IRCTC ticket','Uber cab','Ola intercity'][Math.floor(Math.random()*4)]);
      if(Math.random()>0.5) ins.run(uid,rnd(2000,18000),'expense',catMap['Shopping'],dateAt(m),['Myntra haul','Amazon delivery','Croma','Nykaa'][Math.floor(Math.random()*4)]);
      if(Math.random()>0.6) ins.run(uid,rnd(500,12000),'expense',catMap['Healthcare'],dateAt(m),['Apollo pharmacy','Doctor visit','Lab tests','Max OPD'][Math.floor(Math.random()*4)]);
      if(Math.random()>0.5) ins.run(uid,rnd(15000,55000),'income',catMap['Freelance'],dateAt(m),'Freelance project payout');
      if(Math.random()>0.6) ins.run(uid,rnd(3000,12000),'income',catMap['Investments'],dateAt(m,15),['Zerodha P&L','SIP returns','Dividend credit'][Math.floor(Math.random()*3)]);
      if(Math.random()>0.7) ins.run(uid,rnd(500,2000),'expense',catMap['Misc'],dateAt(m),['Birthday gift','Donation','Office contribution'][Math.floor(Math.random()*3)]);
    }
  });
  fill();
  console.log('  transactions: '+db.prepare('SELECT COUNT(*) as n FROM transactions').get().n);
  console.log('\nDone! Credentials:');
  console.log('  admin@finance.dev    / Admin123!');
  console.log('  analyst@finance.dev  / Analyst123!');
  console.log('  viewer@finance.dev   / Viewer123!');
}
seed();
