
const express = require('express');
const cookieParser = require('cookie-parser');
const { engine } = require('express-handlebars');
const path = require('path');
const mongoose = require('mongoose') // npm install mongodb

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.use(express.static(path.join(__dirname, 'public')));


//Almacenamientos de usuarios a traves de la base de datos y atributos de los mismos
const UsuarioSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0
  },
  historial: [{
      tipo: {
          type: String,
          enum: ['deposito', 'retiro'], // Solo permite estos dos valores
          required: true
      },
      monto: {
          type: Number,
          required: true
      },
      fecha: {
          type: Date,
          default: Date.now // Guarda la fecha automáticamente
      }
  }]
}, {
  collection: 'Usuario'
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);


// verificar si el usuario tiene sesión activa mediante cookie
app.use((req, res, next) => {
  const ID = req.cookies.ID;

  // Si el usuario ya tiene una cookie y entra al inicio, login o signup → redirigir a ruleta
  if (ID && (req.path === '/' || req.path === '/logIn' || req.path === '/signUp')) {
    return res.redirect('/ruleta');
  }

  // Si el usuario NO tiene cookie e intenta entrar a rutas restringidas → enviarlo al inicio
  const rutasProtegidas = ['/perfil', '/wallet', '/ruleta'];
  if (!ID && rutasProtegidas.includes(req.path)) {
    return res.redirect('/');
  }

  // Si pasa las verificaciones, continuar con la siguiente ruta
  next();
});

//logica de los hadlebars
app.get('/', (req, res) => {
    res.render('landSite');
});

//sign up
app.get('/signUp', (req, res) => {
    res.render('signUp');
});

app.post('/signUp', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  try {
    // Validaciones de contraseña
    const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;
    if (!regex.test(password)) {
      return res.status(400).render('signUp', {
        error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.'
      });
    }

    // Confirmar contraseñas
    if (password !== confirmPassword) {
      return res.status(400).render('signUp', {
        error: 'Las contraseñas no coinciden.'
      });
    }

    // Crear usuario nuevo
    const nuevoUsuario = new Usuario({ username, password });
    await nuevoUsuario.save();

    res.cookie('ID', nuevoUsuario._id.toString());
    res.status(201).render('welcome', { usuario: username });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).render('signUp', {
        error: 'El nombre de usuario ya existe. Elige otro.'
      });
    }
    console.error('Error en registro:', error);
    res.status(500).render('signUp', {
      error: 'Error interno del servidor. Intenta más tarde.'
    });
  }
});

//logIn
app.get('/logIn', (req,res)=>{
  res.render('logIn');
})

app.post('/logIn', async(req, res) => {
    const { username, password } = req.body

  try {
    const usuario = await Usuario.findOne({ username, password })

    if (!usuario) {
      return res.send('Credenciales inválidas. <a href="/login">Intentar de nuevo</a>')
    }
    res.cookie('ID', usuario._id.toString())
    res.render('welcome', {usuario:username})
  } catch (err) {
    console.error('Error al buscar usuario:', err)
    res.send('Error interno del servidor')
  }
});

//ruleta
app.get('/ruleta', async(req, res)=>{
    try{
        const ID = req.cookies.ID;
        const usuario = await Usuario.findById(ID);
        if(!usuario){
          res.send(`usuario ID: ${ID}`);
        }
        const saldo = usuario.balance? usuario.balance: '0';
        
        res.cookie('saldo', saldo.toString())

        res.render('ruleta', {saldo:saldo})
    }
    catch(error){
        console.error(error);
        res.status(500).send('error del servidor');
    }
})

//wallet  muestra saldo e historial
app.get('/wallet', async (req, res) => {
  try {
    const ID = req.cookies.ID;
    const usuario = await Usuario.findById(ID);
    if (!usuario) {
      return res.status(400).send('Usuario no encontrado');
    }

    // Ordenar historial: transacciones más recientes primero
    const historialOrdenado = [...usuario.historial].reverse();

    res.render('wallet', {
      saldo: usuario.balance,
      historial: historialOrdenado
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar wallet');
  }
});

//manejar depósitos y retiros
app.post('/wallet', async (req, res) => {
  try {
    const ID = req.cookies.ID;
    const add = Number(req.body.add);
    const subtrac = Number(req.body.subtrac);

    const usuario = await Usuario.findById(ID);
    if (!usuario) {
      return res.status(400).render('wallet', { saldo: 0, mensaje: 'Usuario no encontrado' });
    }

    //  Depositar dinero
    if (add && add > 0) {
      const transaccion = { tipo: 'deposito', monto: add };

      const update = await Usuario.findByIdAndUpdate(
        ID,
        {
          $push: { historial: transaccion },
          $inc: { balance: add }
        },
        { new: true }
      );

      res.cookie('saldo', update.balance.toString());

      const historialOrdenado = [...update.historial].reverse();
      return res.render('wallet', {
        saldo: update.balance,
        historial: historialOrdenado,
        mensaje: `Se agregaron $${add}`
      });
    }

    // Retirar dinero (verificación de saldo)
    if (subtrac && subtrac > 0) {
      if (usuario.balance < subtrac) {
        const historialOrdenado = [...usuario.historial].reverse();
        return res.render('wallet', {
          saldo: usuario.balance,
          historial: historialOrdenado,
          mensaje: 'Saldo insuficiente. No puedes retirar más de lo que tienes.'
        });
      }

      const transaccion = { tipo: 'retiro', monto: subtrac };

      const update = await Usuario.findByIdAndUpdate(
        ID,
        {
          $push: { historial: transaccion },
          $inc: { balance: -subtrac }
        },
        { new: true }
      );

      res.cookie('saldo', update.balance.toString());

      const historialOrdenado = [...update.historial].reverse();
      return res.render('wallet', {
        saldo: update.balance,
        historial: historialOrdenado,
        mensaje: `Se retiraron $${subtrac}`
      });
    }

    // Si no se ingresó ningún valor válido
    const historialOrdenado = [...usuario.historial].reverse();
    res.status(400).render('wallet', {
      saldo: usuario.balance,
      historial: historialOrdenado,
      mensaje: 'Ingresa un monto válido para depositar o retirar.'
    });

  } catch (error) {
    console.error(error);
    res.status(500).render('wallet', { saldo: 0, mensaje: 'Error del servidor' });
  }
});



//perfil
app.get("/perfil", async(req,res)=>{
  try{
    const ID = req.cookies.ID;
      const usuario = await Usuario.findById(ID);

      const saldo = usuario.balance? usuario.balance: '0';
      const nombre = usuario.username
      
      res.render('perfil', {monto:saldo, username:nombre})
  }
  catch(error){
        console.error(error);
        res.status(500).send('error del servidor');
    }
})

app.post('/logOut', (req,res)=>{
  res.clearCookie('ID');
  res.clearCookie('saldo')

  res.send('sesion cerrada esperamos verte pronto. <a href="/">volver al inicio</a>')
})

app.post('/deleteAccount', async(req,res)=>{
  try{
    const ID = req.cookies.ID;

    await Usuario.findByIdAndDelete(ID);
    
    res.clearCookie('ID');
    res.clearCookie('saldo')

    res.send('tu cuenta se ha eliminado. <a href="/">volver al inicio</a>')
  }
  catch(error){
    console.error(error);
    res.status(500).send('error del servidor');
  }
})
//coneccion a la base de datos
const adressDB = 'mongodb+srv://BTF6:tututuduMaxVerstappen@zzzerver.d9ofxax.mongodb.net/?retryWrites=true&w=majority&appName=zzzerver';

mongoose.connect(adressDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Conexión exitosa a MongoDB Atlas')
})
.catch(err => {
  console.error('Error conectando a MongoDB', err)
})

app.listen(port, () => {
    console.log(`Servidor de cookies listo. Visita http://localhost:${port}`);
});
