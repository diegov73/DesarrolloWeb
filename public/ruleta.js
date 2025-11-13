document.addEventListener("DOMContentLoaded", () => {

  
    // Ruleta
    const canvas = document.getElementById("roulette");
    const ctx = canvas.getContext("2d");
    const spinBtn = document.getElementById("spin-btn");
    const resultNumberDiv = document.getElementById("resultNumber");
    const resultMoneyDiv = document.getElementById("resultMoney"); // Para mostrar ganancia/pérdida

    // Apuestas
    const numberTable = document.getElementById("tablaRuleta");
    const clearBtn = document.getElementById("clear-btn");
    const totalBetDisplay = document.getElementById("total-amount");
    const betListDisplay = document.getElementById("numbers-list");

    // Selector de Fichas
    const chipSelector = document.getElementById("chip-selector");
    let currentChipValue = 1; // Ficha de 1 seleccionada por defecto

    // Formulario (para enviar al servidor)
    const resultForm = document.getElementById("resultado-form");
    const hiddenNumero = document.getElementById("numeroGanador");
    const hiddenColor = document.getElementById("colorGanador");
    const hiddenTipo = document.getElementById("tipoApuesta");
    const hiddenTotal = document.getElementById("totalApostado");
    const hiddenResultado = document.getElementById("saldoGanado"); // name="resultado"

    // Balance (del main.handlebars)
    const balanceDisplay = document.getElementById("saldo");



    let totalBalance = 0;
    if (balanceDisplay) {
       
        totalBalance = parseInt(balanceDisplay.textContent.replace('$', ''), 10) || 0;
    } else {
        console.error("Error: No se encontró el elemento #saldo.");
    }

    let betsPlaced = {}; 
    let totalBetAmount = 0;
    let spinning = false;


    const radius = canvas.width / 2;
    const centerX = radius;
    const centerY = radius;
    const europeanOrder = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
        16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
    ];
    const redNumbers = new Set([
        1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
    ]);

    
    const numberProperties = {};
    europeanOrder.forEach(num => {
        if (num === 0) {
            numberProperties[num] = { color: 'green', dozen: null, column: null, odd: null, high: null };
        } else {
            numberProperties[num] = {
                color: redNumbers.has(num) ? 'red' : 'black',
                dozen: num <= 12 ? 1 : (num <= 24 ? 2 : 3),
                column: (num % 3 === 1) ? 1 : (num % 3 === 2) ? 2 : 3,
                odd: num % 2 !== 0,
                high: num > 18
            };
        }
    });
    
    for (let i = 3; i <= 36; i += 3) {
        numberProperties[i].column = 3;
    }

    const numbers = europeanOrder.map((n) => ({
        num: n,
        color: n === 0 ? "green" : redNumbers.has(n) ? "red" : "black",
        props: numberProperties[n] 
    }));

    const numCount = numbers.length;
    const anglePerNum = (2 * Math.PI) / numCount;
    let startAngle = 0;
    let currentRotation = 0;

    function drawWheel() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < numCount; i++) {
            const angle = startAngle + i * anglePerNum;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, angle, angle + anglePerNum);
            ctx.fillStyle = numbers[i].color;
            ctx.fill();
            ctx.stroke();
            // Números
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle + anglePerNum / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = "white";
            ctx.font = "bold 18px Arial";
            ctx.fillText(numbers[i].num, radius - 10, 10);
            ctx.restore();
        }
    }

    function drawPointer() {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius * 0.8);
        ctx.lineTo(centerX - 10, centerY - radius * 0.95);
        ctx.lineTo(centerX + 10, centerY - radius * 0.95);
        ctx.closePath();
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function animate() {
        if (spinning) {
            startAngle += currentRotation;
            currentRotation *= 0.985;
            if (currentRotation < 0.001) {
                currentRotation = 0;
                spinning = false;
                getWinningNumber(); 
            }
        }
        drawWheel();
        drawPointer();
        requestAnimationFrame(animate);
    }

  

    // Función para generar el tablero de números (1-36)
    function generateBoard() {
        if (!numberTable) return;
        
        const zeroCell = document.createElement('div');
        zeroCell.className = 'cell bet-number num-green';
        zeroCell.textContent = '0';
        zeroCell.dataset.bet = 'Num0';
        zeroCell.style.gridColumn = 'span 1'; 
        numberTable.appendChild(zeroCell);

        
        for (let i = 1; i <= 36; i++) {
            const cell = document.createElement('div');
            const isRed = redNumbers.has(i);
            cell.className = `cell bet-number ${isRed ? 'num-red' : 'num-black'}`;
            cell.textContent = i;
            cell.dataset.bet = `Num${i}`;
            numberTable.appendChild(cell);
        }
    }
    
    generateBoard(); 


    const allBetCells = document.querySelectorAll('.cell');

    
    chipSelector.addEventListener('click', (e) => {
        const clickedChip = e.target.closest('.chip');
        if (clickedChip) {
            // Quitar 'selected' de todas
            chipSelector.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
            // Añadir 'selected' a la clickeada
            clickedChip.classList.add('selected');
            // Actualizar el valor de la ficha actual
            currentChipValue = parseInt(clickedChip.dataset.value, 10);
        }
    });

    // Event listener para todas las celdas de apuesta
    allBetCells.forEach(cell => {
        cell.addEventListener('click', () => {
            if (spinning) {
                alert("No puedes apostar mientras la ruleta gira.");
                return;
            }

            // Ya no leemos el input, usamos la variable currentChipValue
            const betValue = currentChipValue;

            if (totalBalance < betValue) {
                alert("No tienes saldo suficiente para esta apuesta.");
                return;
            }

            const betType = cell.dataset.bet;

            // Actualizar estado
            totalBalance -= betValue;
            totalBetAmount += betValue;
            betsPlaced[betType] = (betsPlaced[betType] || 0) + betValue;

            updateUI();
        });
    });

    // Limpiar apuestas
    clearBtn.addEventListener("click", () => {
        if (spinning) return;
        
        // Devolver el dinero apostado al balance
        totalBalance += totalBetAmount;
        totalBetAmount = 0;
        betsPlaced = {};
        
        updateUI();
    });

    

    spinBtn.addEventListener("click", () => {
        if (spinning) return;

        if (totalBetAmount === 0) {
            alert("Debes realizar al menos una apuesta para girar.");
            return;
        }

        spinning = true;
        currentRotation = 0.15 + Math.random() * 0.15;
        resultNumberDiv.textContent = "Girando...";
        resultMoneyDiv.textContent = ""; // Limpiar resultado anterior
    });

    function getWinningNumber() {
        const pointerAngle = (3 * Math.PI) / 2;
        const normalizedStartAngle = (startAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        let effectiveAngle = (pointerAngle - normalizedStartAngle + 2 * Math.PI) % (2 * Math.PI);
        let index = Math.floor(effectiveAngle / anglePerNum);
        
        const winner = numbers[index]; // winner es { num: X, color: 'Y', props: {...} }

        resultNumberDiv.textContent = `Número ganador: ${winner.num} (${winner.color})`;

        calculateWinnings(winner);
    }

    function calculateWinnings(winner) {
        let payout = 0;
        const winNum = winner.num;
        const winProps = winner.props;

        for (const betType in betsPlaced) {
            const betAmount = betsPlaced[betType];
            
            // Apuestas a número (ej: "Num0", "Num32")
            if (betType.startsWith("Num")) {
                if (betType === `Num${winNum}`) {
                    payout += betAmount * 36; // Pago 35:1 + apuesta original
                }
            } 
            // Apuestas externas (pierden si sale 0)
            else if (winNum !== 0) {
                switch (betType) {
                    // Simples (Pago 1:1 -> ganas x2)
                    case 'red':
                        if (winProps.color === 'red') payout += betAmount * 2;
                        break;
                    case 'black':
                        if (winProps.color === 'black') payout += betAmount * 2;
                        break;
                    case 'even': // Par
                        if (!winProps.odd) payout += betAmount * 2;
                        break;
                    case 'odd': // Impar
                        if (winProps.odd) payout += betAmount * 2;
                        break;
                    case 'low': // 1-18
                        if (!winProps.high) payout += betAmount * 2;
                        break;
                    case 'high': // 19-36
                        if (winProps.high) payout += betAmount * 2;
                        break;
                    
                    
                    case '1st12':
                        if (winProps.dozen === 1) payout += betAmount * 3;
                        break;
                    case '2nd12':
                        if (winProps.dozen === 2) payout += betAmount * 3;
                        break;
                    case '3rd12':
                        if (winProps.dozen === 3) payout += betAmount * 3;
                        break;
                    case 'col1':
                        if (winProps.column === 1) payout += betAmount * 3;
                        break;
                    case 'col2':
                        if (winProps.column === 2) payout += betAmount * 3;
                        break;
                    case 'col3':
                        if (winProps.column === 3) payout += betAmount * 3;
                        break;
                }
            }
        }

        const netGain = payout - totalBetAmount;

        // Actualizar balance local en la UI (temporalmente)
        totalBalance += payout; // Se suma el pago (la apuesta ya se había restado)

        // Mostrar resultado monetario
        if (netGain > 0) {
            resultMoneyDiv.textContent = `¡Ganaste $${netGain}!`;
            resultMoneyDiv.style.color = 'green';
        } else {
            resultMoneyDiv.textContent = `Perdiste $${totalBetAmount}.`;
            resultMoneyDiv.style.color = 'red';
        }
        
        // Preparar y enviar el formulario al servidor
        submitGameResult(winner, netGain);


        totalBetAmount = 0;
        betsPlaced = {};
        updateUI(); // Actualiza la UI con el nuevo balance
    }



    function submitGameResult(winner, netGain) {
        if (!resultForm) {
            console.error("Formulario #resultado-form no encontrado.");
            return;
        }

        hiddenNumero.value = winner.num;
        hiddenColor.value = winner.color;
        hiddenTipo.value = Object.keys(betsPlaced).join(',');
        hiddenTotal.value = totalBetAmount;
        hiddenResultado.value = netGain; 

        
        resultForm.submit();
    }

    

    function updateUI() {
        if (balanceDisplay) {
            balanceDisplay.textContent = totalBalance + '$';
        }
        if (totalBetDisplay) {
            totalBetDisplay.textContent = totalBetAmount;
        }
        
        // Actualiza la lista de apuestas
        if (betListDisplay) {
            const betsString = Object.entries(betsPlaced)
                .map(([key, value]) => `${key}: $${value}`)
                .join(', ');
            betListDisplay.textContent = betsString || 'Ninguna';
        }
    }
    
   
    updateUI();
    animate(); 
});