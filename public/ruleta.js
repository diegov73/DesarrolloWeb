document.addEventListener('DOMContentLoaded', () => { //esto asegura que el DOM este cargado antes de ejecutar el script

const roulette = document.getElementById("roulette");
const ctx = roulette.getContext("2d");
const resultMoneyDiv = document.getElementById("resultMoney");
const resultNumberDiv = document.getElementById("resultNumber");
const spinBtn = document.getElementById("spin-btn");

const numeros = Array.from({ length: 37 }, (_, i) => i); // 0–36
let girando = false;
let saldo;
let resultado;
let ultimosNumeros = [];
let ultimasApuestas = [];

const saldoElement = document.querySelector('.rr-saldo'); //se sincroniza el saldo
  if (saldoElement) {  //verifica que exista el elemento
    saldoElement.textContent = saldo; //se actualiza 
  }

//FUNCIONES DE COLOR
function esRojo(n) {
  return [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n);
}
function esNegro(n) {
  return n !== 0 && !esRojo(n);
}

function RuletaVision() {
  const radio = roulette.width /2;
  const angulo = (2 * Math.PI) / numeros.length;

  const ordenNumeros = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]; [[3]]

  ordenNumeros.forEach((n, i) => { 
    const startAngle = i * angulo - Math.PI / 2; //hace que el 0 este en la parte superior
    const endAngle = (i + 1) * angulo - Math.PI / 2;

    //dibuja el sector
    ctx.beginPath();
    ctx.moveTo(radio, radio);
    ctx.fillStyle = n === 0 ? "green" : esRojo(n) ? "red" : "black";
    ctx.arc(radio, radio, radio, startAngle, endAngle);
    ctx.fill();

    //coloca el numero
    ctx.save(); 
    ctx.translate(radio, radio); 
    ctx.rotate(startAngle + angulo / 2); 
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 14px Arial"; 
    ctx.fillStyle = "white"; 
    ctx.fillText(n.toString(), radio * 0.85, 0); 
    ctx.restore();
  });
}
RuletaVision();

//GIRO DE RULETA 
spinBtn.addEventListener("click", () => {
  if (girando || bets.size === 0) { //error numeros
    resultMoneyDiv.innerHTML = '<span style="color: red; font-weight: bold;">Error </span>';
    return;
  }

  girando = true;
  const valorFicha = parseInt(valor.value, 10);
  if (isNaN(valorFicha) || valorFicha <= 0) { //error fichas
    resultMoneyDiv.innerHTML = '<br><span style="color: red; font-weight: bold;">Error: Ingrese un valor valido para la ficha </span>';
    girando = false;
    return;  //evita calculos invalidos
  }

  const totalApostado = valorFicha * bets.size;
   if (totalApostado > saldo) { //error saldo/dinero
      resultMoneyDiv.innerHTML = '<span style="color: red; font-weight: bold;">Error: Saldo insuficiente </span>';
      girando = false;
      return;
    }
    saldo -= totalApostado;

  const duracion = Math.random() * 4000 + 2000; // 3–6 s
  const numeroGanador = Math.floor(Math.random() * 37);
  const rotacionFinal = 360 * 10 + (numeroGanador * (360 / 37));

  roulette.style.transition = `transform ${duracion / 1000}s ease-out`;
  roulette.style.transform = `rotate(${rotacionFinal}deg)`;

  //DETERMINAR COLOR GANADOR
    let colorGanador;
    if (numeroGanador === 0) {
      colorGanador = "green";
    } else if (esRojo(numeroGanador)) {
      colorGanador = "red";
    } else {
      colorGanador = "black";
    }

  setTimeout(() => {
    girando = false;
    roulette.style.transition = "none";
    roulette.style.transform = "rotate(0deg)";
    resultNumberDiv.innerHTML = `Número ganador: <span style="color: ${colorGanador}; font-weight: bold;">${numeroGanador} </span>`
    const {variacion, betType, saldo, resultado} = calcularGanancias(numeroGanador, colorGanador, valorFicha, totalApostado); //retorna valores
    actualizarHistoricos(numeroGanador, colorGanador, totalApostado, variacion);
    let tipoApuesta = betType || 'Ninguna';
    setFormValues(15, 'black', 'even', 100, 'perdida'); //envia el formulario
    setTimeout(reinicio, 25000); //reinicio despues de mostrar resultados, 25s
  }, duracion);  
});

//INICIO TABLA
//NUMERO EN LA TABLA
const listaNumero = Array.from({ length: 37 }, (_, i) => i); //0 a 36

//DETERMINAR COLOR DE CADA NUMERO
function getColor(num) {
  if (num === 0) return 'green';
  const rojos = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  return rojos.includes(num) ? 'red' : 'black';
}

//ESTADO DE APUESTAS
let bets = new Set(); 

const table = document.getElementById('tablaRuleta');
const clearBtn = document.getElementById('clear-btn');
const numbersList = document.getElementById('numbers-list');

//VALOR DE LA FICHA
const valor = document.getElementById('valor-ficha');

//EL 0
const zeroCell = document.createElement('div');
zeroCell.className = `cell ${getColor(0)}`;
zeroCell.textContent = '0';
zeroCell.dataset.number = '0';
zeroCell.addEventListener('click', toggleBet);
table.appendChild(zeroCell);

//TRES FILAS DE NUMEROS
for (let col = 0; col < 12; col++) {
  for (let fila = 0; fila < 3; fila++) {
    const numero = col * 3 + fila + 1;
    if (numero <= 36) {
      const cell = document.createElement('div');
      cell.className = `cell ${getColor(numero)}`;
      cell.textContent = numero;
      cell.dataset.number = numero;
      cell.addEventListener('click', toggleBet);
      table.appendChild(cell);     
    }
  }
}

document.querySelectorAll('#outsideBets .cell').forEach(cell => {
    cell.addEventListener('click', toggleBet);
  });

//PARA SELECCIONAR APUESTAS
function toggleBet(e) {
  const target = e.target;
  let key;

  if (target.dataset.number !== undefined) {
    key = `num-${target.dataset.number}`;} 

  else if (target.dataset.bet !== undefined) {
    key = `bet-${target.dataset.bet}`;}

  else {return;}

  if (bets.has(key)) {
    bets.delete(key);
    target.classList.remove('selected'); }

    else{
    bets.add(key);
    target.classList.add('selected');}

  actualizarVista();
}

//LIMPIAR TABLA
clearBtn.addEventListener('click', () => {
  bets.clear();
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('selected');
  });
  actualizarVista();
});

//VISTA APUESTAS
function actualizarVista() {
  const lista = Array.from(bets).sort((a, b) => a - b);
  numbersList.textContent = lista.length ? lista.join(', ') : 'No hay apuestas';
}

//INICIO PAGO DE LAS APUESTAS
function calcularGanancias(numeroGanador, colorGanador, valorFicha, totalApostado) {
  let ganancias = 0;
  let betTypes = [];
bets.forEach((key) => {  //APUESTAS A NUMEROS
      if (key.startsWith('num-')) {
        const apuesta = parseInt(key.split('-')[1], 10);
        if (apuesta === numeroGanador) {
          ganancias += valorFicha * 36; 
          betTypes.push('simple');
        }
      }
    });

 bets.forEach((key) => { //APUESTAS EXTERIORES
      if (key.startsWith('bet-')) {
        const betTypeA = key.split('-')[1];
        let payout = 0;
        let matches = false; //si la apuesta exterior se realizo, es true

        // Apuestas simples 
        if (betType === 'red' && colorGanador === 'red') { payout = 1; matches = true; }
        else if (betType === 'black' && colorGanador === 'black') { payout = 1; matches = true; }
        else if (betType === 'even' && numeroGanador % 2 === 0 && numeroGanador !== 0) { payout = 1; matches = true; }
        else if (betType === 'odd' && numeroGanador % 2 === 1) { payout = 1; matches = true; }
        else if (betType === 'low' && numeroGanador >= 1 && numeroGanador <= 18) { payout = 1; matches = true; }
        else if (betType === 'high' && numeroGanador >= 19 && numeroGanador <= 36) { payout = 1; matches = true; }

        // Docenas 
        else if (betType === '1st12' && numeroGanador >= 1 && numeroGanador <= 12) { payout = 2; matches = true; }
        else if (betType === '2nd12' && numeroGanador >= 13 && numeroGanador <= 24) { payout = 2; matches = true; }
        else if (betType === '3rd12' && numeroGanador >= 25 && numeroGanador <= 36) { payout = 2; matches = true; }

        // Columnas  
        const col1Nums = [1,4,7,10,13,16,19,22,25,28,31,34];
        const col2Nums = [2,5,8,11,14,17,20,23,26,29,32,35];
        const col3Nums = [3,6,9,12,15,18,21,24,27,30,33,36];
        if (betType === 'col1' && col1Nums.includes(numeroGanador)) { payout = 2; matches = true; }
        else if (betType === 'col2' && col2Nums.includes(numeroGanador)) { payout = 2; matches = true; }
        else if (betType === 'col3' && col3Nums.includes(numeroGanador)) { payout = 2; matches = true; }
 
      if (matches) {
    ganancias += valorFicha * (payout + 1);
    betTypes.push(betTypeA);
  }
}
});

saldo += ganancias;

  const variacion = ganancias - totalApostado;
  if (variacion <= 0) {resultado = 'perdida';} //si variacion es 0 o negativa, se pierde
  else {resultado = 'ganancia';}

  let colorVariacion = variacion >= 0 ? 'green' : 'red';
  resultMoneyDiv.innerHTML = `Ganancias: <span style="color: green; font-weight: bold;">${ganancias}</span><br>Pérdida/Ganancia neta: <span style="color: ${colorVariacion}; font-weight: bold;">${variacion}</span>`;
  const betType = betTypes.join(', ');
  return {variacion, betType, saldo, resultado};
}
 
//ACTUALIZAR ultimas apuestas y numeros
  function actualizarHistoricos(numeroGanador, colorGanador, totalApostado, variacion) {
    //ultimos numeros
    ultimosNumeros.unshift({ numero: numeroGanador, color: colorGanador, colorTexto: colorGanador });
    if (ultimosNumeros.length > 5) ultimosNumeros.pop();

    //ultimas apuestas 
    const numerosApostados = Array.from(bets).join(', ');
    ultimasApuestas.unshift({ numeros: numerosApostados, monto: totalApostado, variacion });
    if (ultimasApuestas.length > 5) ultimasApuestas.pop();

    const ultimosList=document.querySelector('.rr-lista');
    if (ultimosList) {
    ultimosList.innerHTML = ultimosNumeros.map(item => `<li><span class="${item.color}">${item.numero} (${item.colorTexto})</span></li>`).join('');
  }

//para ultimasApuestas 
    const ultimasTableBody = document.querySelector('.rr-tabla tbody');
    if (ultimasTableBody) {
      ultimasTableBody.innerHTML = ultimasApuestas.map(apuesta => `
        <tr>
          <td>${apuesta.numeros}</td>
          <td>${apuesta.monto}</td>
          <td>${apuesta.variacion}</td>
        </tr>
      `).join('');
    }
  }

  //setea valores y envia si es necesario 
  function setFormValues(numeroGanador, colorGanador, tipoApuesta, totalApostado, resultado) {
    document.getElementById('numeroGanador').value = numeroGanador;
    document.getElementById('colorGanador').value = colorGanador;
    document.getElementById('tipoApuesta').value = tipoApuesta;
    document.getElementById('totalApuestado').value = totalApostado; 
    document.getElementById('resultado').value = resultado; 
  }

//reinicio despues de todos los calculos (despues de un giro)
function reinicio (){
  bets.clear();
  document.querySelectorAll('.cell').forEach(cell => {
  cell.classList.remove('selected');
  });
  actualizarVista();
  //Elimina los mensajes
  resultMoneyDiv.innerHTML = '';
  resultNumberDiv.innerHTML = '';
}
}); //