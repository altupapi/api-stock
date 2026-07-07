const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();


// 📄 Herramientas para la Boleta PDF
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');


// 1. Configuración de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


// Crear la carpeta "boletas" automáticamente si no existe
const dirBoletas = path.join(__dirname, 'boletas');
if (!fs.existsSync(dirBoletas)){
    fs.mkdirSync(dirBoletas);
}


// Hacer que las boletas se puedan ver por internet (públicas)
app.use('/boletas', express.static(dirBoletas));


// 🌟 2. TRUCO CRÍTICO: Habilitar los lectores de JSON ARRIBA de las rutas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 🔌 3. Configuración de conexión con Clever Cloud
const db = mysql.createConnection({
    host: 'bmnj8uvb8uf33uyafbjm-mysql.services.clever-cloud.com', 
    user: 'ugqnvchebaoj1muj',      
    password: 'S5LZpQzSFbKJE2e9MvP6', 
    database: 'bmnj8uvb8uf33uyafbjm',  
    port: 3306
});

db.connect(err => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err);
        return;
    }
    console.log('✅ Conectado exitosamente a MySQL en Clever Cloud');
});

// =========================================================================
// 🚚 ENDPOINT CORREGIDO: PROCESAR COMPRAS A PROVEEDORES (ENTRADA DE STOCK)
// =========================================================================
app.post('/api/compras-proveedor', (req, res) => {
    const { proveedor, detalles } = req.body;
    
    console.log(`🚚 Recibiendo entrada de stock del proveedor: ${proveedor || 'Genérico'}`);

    if (!detalles || detalles.length === 0) {
        return res.status(400).json({ error: "No hay productos en la lista de compra" });
    }

    let consultasCompletadas = 0;
    let huboError = false;

    detalles.forEach(item => {
        // ✅ USAMOS 'id' que es la columna real de tu tabla
        const querySumarStock = 'UPDATE productos SET cantidad = cantidad + ? WHERE id = ?';
        
        // Convertimos a número entero de JavaScript seguro (soporta valores mayores que un int de Java)
        const idProducto = Number(item.producto_id);
        const cantidadSumar = parseInt(item.cantidad);

        db.query(querySumarStock, [cantidadSumar, idProducto], (err, result) => {
            consultasCompletadas++;

            if (err) {
                console.error(`❌ Error sumando stock para ID ${item.producto_id}:`, err.message);
                huboError = true;
            }

            if (consultasCompletadas === detalles.length) {
                if (huboError) {
                    return res.status(500).json({ error: "La compra se procesó con errores en algunos artículos" });
                }
                console.log("✅ ¡Entrada de stock registrada exitosamente en Clever Cloud!");
                res.status(201).json({ status: "success", message: "🎉 ¡Stock reabastecido con éxito!" });
            }
        });
    });
});


// =========================================================================
// 🔐 ENDPOINT: Inicio de sesión dinámico desde Base de Datos (Con Roles)
// =========================================================================
app.post('/api/login', (req, res) => {
    console.log("Datos recibidos en Login:", req.body);
    
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const query = 'SELECT id, usuario, rol FROM usuarios WHERE usuario = ? AND password = ?';

    db.query(query, [usuario, password], (err, result) => {
        if (err) {
            console.error("ERROR CRÍTICO EN MYSQL:", err);
            return res.status(500).json({ error: "Error interno del servidor en la consulta SQL", detalle: err.message });
        }

        if (result.length > 0) {
            return res.status(200).json({ 
                mensaje: "Login exitoso", 
                usuario: result[0].usuario,
                rol: result[0].rol 
            });
        } else {
            return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });
        }
    });
});

// =========================================================================
// 🧠 RUTA 100% MATEMÁTICA Y SIN LÍMITES: ANÁLISIS PREDICTIVO (SIN IA)
// =========================================================================
app.get('/api/inteligencia', (req, res) => {
    
    // 1. Consultamos productos en stock crítico (menos de 5 unidades)
    const sqlStockCritico = "SELECT nombre, cantidad, precio FROM productos WHERE cantidad <= 5 ORDER BY cantidad ASC LIMIT 5";
    
    db.query(sqlStockCritico, (errCritico, productosCriticos) => {
        if (errCritico) {
            console.error("❌ Error base de datos (Stock):", errCritico);
            return res.status(500).json({ mensaje: "Error al consultar inventario", detalle: errCritico.message });
        }

        // 2. Calculamos el valor del inventario para la proyección de ventas
        const sqlResumenVentas = "SELECT CAST(IFNULL(SUM(cantidad * precio), 0) AS DECIMAL(10,2)) AS valor_inventario FROM productos";

        db.query(sqlResumenVentas, (errVentas, resultadoVentas) => {
            if (errVentas) {
                console.error("❌ Error base de datos (Ventas):", errVentas);
                return res.status(500).json({ mensaje: "Error al calcular ventas", detalle: errVentas.message });
            }

          const valorInventario = parseFloat(resultadoVentas[0].valor_inventario) || 0;
          const ventasMes = parseFloat(((valorInventario * 0.005) * 24).toFixed(2));

            // 3. 📝 LÓGICA DE TEXTO AUTOMÁTICO (Reemplaza a la IA)
            let textoRecomendaciones = "";
            
            if (productosCriticos.length === 0) {
                textoRecomendaciones = `✅ ¡Excelente trabajo con el stock!\n\nTu inventario está muy sano, no tienes productos en riesgo de agotarse.\n\n📈 Predicción:\nBasado en tus datos actuales, estimamos que el flujo de ventas alcance los S/ ${ventasMes} este mes. ¡Sigue así!`;
            } else {
                // Extraemos solo los nombres para que el texto se lea natural
                const nombresCriticos = productosCriticos.map(p => p.nombre.substring(0, 20) + "...").join(", ");
                
                textoRecomendaciones = `⚠️ ¡Alerta de Inventario!\n\nTienes ${productosCriticos.length} productos a punto de agotarse (Ej: ${nombresCriticos}).\n\n💡 Recomendaciones:\n1. Reabastece urgente estos artículos para no perder clientes frecuentes.\n2. Tu proyección mensual es de S/ ${ventasMes}. ¡Evita que la falta de stock congele tus ganancias!`;
            }

            // 4. 📈 LÓGICA DEL GRÁFICO (Curva ascendente matemática de 7 puntos)
            const datosGraficoPrediccion = [
                Math.round(ventasMes * 0.3),  // Hace 3 semanas
                Math.round(ventasMes * 0.45), // Hace 2 semanas
                Math.round(ventasMes * 0.65), // Hace 1 semana
                Math.round(ventasMes * 0.85), // Días recientes
                Math.round(ventasMes),        // HOY
                Math.round(ventasMes * 1.15), // Proyección futuro cercano (+15%)   
                Math.round(ventasMes * 1.3)   // Proyección meta final (+30%)
            ];

            // 5. Enviamos la respuesta a Android. 
            // ⚡ ¡Responderá al instante!
            return res.json({
                recomendaciones: textoRecomendaciones,
                prediccionesGrafico: datosGraficoPrediccion
            });
        });
    });
});

// 🧑‍💼 NUEVA RUTA: REGISTRAR EMPLEADO
// ==========================================
app.post('/api/usuarios', (req, res) => {
    // Extraemos los datos que envía Android
    const { usuario, password, rol } = req.body;

    // Validación básica
    if (!usuario || !password) {
        return res.status(400).json({ mensaje: "Usuario y contraseña son obligatorios" });
    }

    // Por seguridad, si no llega un rol desde la app, forzamos que sea Trabajador
    const rolAsignado = rol ? rol : 'Trabajador';

    // Ajusta los nombres de las columnas (usuario, password, rol) 
    // si en tu base de datos se llaman diferente (ej. 'clave', 'nombre_usuario')
    const sql = "INSERT INTO usuarios (usuario, password, rol) VALUES (?, ?, ?)";
    
    db.query(sql, [usuario, password, rolAsignado], (err, result) => {
        if (err) {
            console.error("Error al registrar el empleado:", err);
            return res.status(500).json({ mensaje: "Error en la base de datos al crear el usuario" });
        }
        
        console.log("✅ Nuevo empleado registrado con ID:", result.insertId);
        res.status(201).json({ 
            mensaje: "Cuenta creada con éxito",
            id: result.insertId 
        });
    });
});
// =========================================================================
// 📦 ENDPOINTS: Gestión de Productos de Agropets
// =========================================================================

// 📥 Recibir y registrar producto desde la App Móvil (POST)
app.post('/api/productos', (req, res) => {
    console.log("📥 Datos recibidos desde Android:", req.body);
    const { id, nombre, cantidad, precio, categoria } = req.body; 

    const categoriaFinal = category || 'General';
    
    // ✅ Agregamos 'id' a la consulta para guardar el código de barras directamente como ID
    const query = 'INSERT INTO productos (id, nombre, cantidad, stock, precio, precio_venta, categoria) VALUES (?, ?, ?, ?, ?, ?, ?)';
    
    db.query(query, [Number(id), nombre, parseInt(cantidad), parseInt(cantidad), parseFloat(precio), parseFloat(precio), categoriaFinal], (err, result) => {
        if (err) {
            console.error("❌ Error de MySQL:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("✅ ¡Producto guardado con éxito!");
        res.status(201).json({ status: "success", message: '📦 Producto registrado con éxito' });
    });
});

// 📤 Consultar productos filtrados u ordenados por categoría para el catálogo
app.get('/api/productos', (req, res) => {
    const categoriaFiltro = req.query.categoria;

    if (categoriaFiltro) {
        const queryFiltro = 'SELECT * FROM productos WHERE categoria = ? ORDER BY nombre ASC';
        db.query(queryFiltro, [categoriaFiltro], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    } else {
        db.query('SELECT * FROM productos ORDER BY categoria ASC, nombre ASC', (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    }
});

// 🔄 Actualizar un producto existente por su ID (PUT)
app.put('/api/productos/:id', (req, res) => {
    const id = req.params.id;
    const { nombre, precio, cantidad, categoria } = req.body;

    const query = 'UPDATE productos SET nombre = ?, precio = ?, cantidad = ?, categoria = ? WHERE id = ?';
    
    db.query(query, [nombre, precio, cantidad, categoria, id], (err, result) => {
        if (err) {
            console.error("❌ Error en la base de datos:", err);
            return res.status(500).json({ error: err.message });
        }

        // 🔍 ESTA LÍNEA TE DIRÁ LA VERDAD:
        console.log(`📊 Filas que coincidieron: ${result.matchedRows || result.affectedRows}`);

        if ((result.matchedRows || result.affectedRows) === 0) {
            console.log(`⚠️ Alerta: Se intentó editar el ID ${id} pero NO existe en la base de datos.`);
            return res.status(404).json({ message: "El producto no existe con ese ID" });
        }

        console.log(`✅ ¡Producto con ID ${id} modificado con éxito!`);
        res.json({ message: "Producto actualizado" });
    });
});

// 🏷️ Obtener la lista única de categorías activas de Agropets
app.get('/api/categorias', (req, res) => {
    const queryCategorias = 'SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL ORDER BY categoria ASC';
    
    db.query(queryCategorias, (err, results) => {
        if (err) {
            console.error("❌ Error al obtener categorías:", err.message);
            return res.status(500).json({ error: err.message });
        }
        
        const categoriasLimpias = results.map(row => row.categoria);
        console.log("🏷️ Categorías enviadas a Android:", categoriasLimpias);
        res.json(categoriasLimpias);
    });
});

// 📊 ENDPOINT DE REPORTES BLINDADO Y DINÁMICO
app.get('/api/resumen', (req, res) => {
    const query = `
        SELECT 
            CAST(IFNULL(SUM(cantidad * precio), 0) AS DECIMAL(10,2)) AS valorInventario,
            CAST(IFNULL(SUM(cantidad), 0) AS SIGNED) AS totalProductos,
            CAST(COUNT(CASE WHEN cantidad < 5 THEN 1 END) AS SIGNED) AS stockBajo
        FROM productos;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("❌ Error al generar reporte:", err.message);
            return res.status(500).json({ error: err.message });
        }

        // Cambia este bloque dentro de app.get('/api/resumen')
const datosBase = results[0];

const valorInventarioReal = parseFloat(datosBase.valorInventario) || 0;
const totalProductosReal = parseInt(datosBase.totalProductos) || 0;
const stockBajoReal = parseInt(datosBase.stockBajo) || 0;

const ventasDiariasCalculadas = valorInventarioReal > 0 ? (valorInventarioReal * 0.005) : 0;
const gananciasMensualesCalculadas = ventasDiariasCalculadas * 24;

const reporteFinanciero = {
    valorInventario: valorInventarioReal,
    totalProductos: totalProductosReal,
    stockBajo: stockBajoReal,
    ventasHoy: parseFloat(ventasDiariasCalculadas.toFixed(2)),       // Dará aprox S/ 1,180.00
    gananciasMes: parseFloat(gananciasMensualesCalculadas.toFixed(2)) // Dará aprox S/ 35,400.00
};

        console.log("📈 Analíticas despachadas a Android con éxito:", reporteFinanciero);
        res.json(reporteFinanciero);
    });
});

// =========================================================================
// 🛒 ENDPOINT ACTUALIZADO: PROCESAR COMPRAS, GUARDAR HISTORIAL Y GENERAR PDF
// =========================================================================
app.post('/api/ventas', (req, res) => {
    // 📥 Atrapamos también los datos del cliente que Android ahora envía
    const { monto_total, detalles, cliente_nombre, cliente_telefono, metodo_pago } = req.body;
    
    console.log(`🛒 Recibiendo venta de Agropets en la nube por: S/ ${monto_total}`);

    if (!detalles || detalles.length === 0) {
        return res.status(400).json({ error: "El carrito de compras está vacío" });
    }

    let consultasCompletadas = 0;
    let huboError = false;

    detalles.forEach(item => {
        const queryDescontarStock = 'UPDATE productos SET cantidad = cantidad - ?, stock = stock - ? WHERE id = ?';
        const idProducto = Number(item.producto_id);
        const cantidadRestar = parseInt(item.cantidad);

        db.query(queryDescontarStock, [cantidadRestar, cantidadRestar, idProducto], (err, result) => {
            consultasCompletadas++;

            if (err) {
                console.error(`❌ Error descontando stock para ID ${item.producto_id}:`, err.message);
                huboError = true;
            }

            // Cuando se termina de descontar todo el stock del carrito
            if (consultasCompletadas === detalles.length) {
                
                if (huboError) {
                    return res.status(500).json({ error: "La venta se procesó con errores en algunos artículos" });
                }

                // 💰 ¡AQUÍ ESTÁ LA MAGIA! GUARDAMOS LA VENTA EN EL HISTORIAL REAL
                const queryGuardarVenta = 'INSERT INTO historial_ventas (monto_total, metodo_pago) VALUES (?, ?)';
                db.query(queryGuardarVenta, [monto_total, metodo_pago || 'Efectivo'], (errHistorial) => {
                    if (errHistorial) {
                         console.error("❌ Error guardando el historial de la venta:", errHistorial);
                    } else {
                         console.log("✅ Venta registrada en el historial monetario.");
                    }

                    // 📄 A PARTIR DE AQUÍ GENERAMOS EL PDF COMO SIEMPRE
                    const idBoletaUnico = Date.now(); 
                    const nombreArchivo = `boleta_${idBoletaUnico}.pdf`;
                    const rutaArchivo = path.join(dirBoletas, nombreArchivo);
                    
                    const doc = new PDFDocument({ size: 'A4', margin: 40 });
                    const writeStream = fs.createWriteStream(rutaArchivo);
                    doc.pipe(writeStream);

                    doc.fillColor('#C41E3A').rect(40, 40, 515, 60).fill(); 
                    doc.fillColor('#FFFFFF').fontSize(20).text('AGROPETS STORE', 55, 52, { bold: true });
                    doc.fontSize(10).text('Tu Pyme de confianza en Alimentos y Línea Agrícola', 55, 76);
                    
                    doc.fillColor('#000000').fontSize(12).text(`BOLETA DE VENTA`, 400, 52, { align: 'right' });
                    doc.fontSize(11).text(`N° B-${idBoletaUnico.toString().slice(-6)}`, 400, 68, { align: 'right', color: '#D2143A' });

                    doc.fillColor('#000000').fontSize(10);
                    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 40, 120);
                    doc.text(`Método de Pago:  ${metodo_pago || 'Efectivo'}`, 40, 135);
                    doc.text(`Cliente:         ${cliente_nombre || 'Cliente General'}`, 40, 150);
                    doc.text(`Teléfono:        ${cliente_telefono || '-'}`, 40, 165);

                    doc.moveTo(40, 190).lineTo(555, 190).stroke('#CCCCCC');

                    let yTabla = 210;
                    doc.font('Helvetica-Bold').fillColor('#333333');
                    doc.text('Descripción', 40, yTabla);
                    doc.text('Cant.', 360, yTabla, { width: 40, align: 'center' });
                    doc.text('P. Unit', 420, yTabla, { width: 50, align: 'right' });
                    doc.text('Importe', 490, yTabla, { width: 65, align: 'right' });
                    
                    doc.moveTo(40, 225).lineTo(555, 225).stroke('#777777');
                    doc.font('Helvetica').fillColor('#000000');

                    yTabla = 235;
                    detalles.forEach(prod => {
                        doc.text(prod.nombre || `Producto ID: ${prod.producto_id}`, 40, yTabla, { width: 300 });
                        doc.text(`${prod.cantidad}`, 360, yTabla, { width: 40, align: 'center' });
                        const pUnit = prod.precio_venta || (monto_total / prod.cantidad);
                        doc.text(`S/ ${pUnit.toFixed(2)}`, 420, yTabla, { width: 50, align: 'right' });
                        doc.text(`S/ ${(pUnit * prod.cantidad).toFixed(2)}`, 490, yTabla, { width: 65, align: 'right' });
                        yTabla += 20;
                    });

                    doc.moveTo(40, yTabla + 5).lineTo(555, yTabla + 5).stroke('#CCCCCC');
                    yTabla += 20;
                    doc.font('Helvetica-Bold').fontSize(12);
                    doc.text('TOTAL A PAGAR:', 340, yTabla);
                    doc.text(`S/ ${parseFloat(monto_total).toFixed(2)}`, 490, yTabla, { width: 65, align: 'right' });

                    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#666666');
                    doc.text('Gracias por su preferencia. Vuelva pronto.', 40, yTabla + 40, { align: 'center' });

                    doc.end(); 

                    writeStream.on('finish', () => {
                        const urlDominio = req.get('host').includes('localhost') ? `http://${req.get('host')}` : `https://agropets-stockpyme.onrender.com`;
                        res.status(201).json({ 
                            status: "success", message: "🎉 ¡Venta procesada con éxito!", pdf_url: `${urlDominio}/boletas/${nombreArchivo}`
                        });
                    });
                }); // <-- Fin del db.query de historial
            }
        });
    });
});
// =========================================================================
// 📊 ENDPOINT: ESTADÍSTICAS REALES DE VENTAS (DÍAS, MESES Y AÑOS)
// =========================================================================
app.get('/api/estadisticas-ventas', (req, res) => {
    
    // 1. Consulta: Ventas de Hoy (Monto exacto del día en curso)
    const sqlHoy = "SELECT IFNULL(SUM(monto_total), 0) AS total_hoy FROM historial_ventas WHERE DATE(fecha) = CURDATE()";
    
    // 2. Consulta: Ventas de este mes agrupadas por DÍA DE LA SEMANA (Lunes, Martes...)
    // Usamos DAYNAME y DAYOFWEEK para ordenar lógicamente
   const sqlDiasSemana = `
        SELECT 
            DAYNAME(fecha) AS dia_semana, 
            SUM(monto_total) AS total 
        FROM historial_ventas 
        WHERE YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)
        GROUP BY WEEKDAY(fecha), DAYNAME(fecha)
        ORDER BY WEEKDAY(fecha);
    `;

    // 3. Consulta: Ventas de este año agrupadas por MESES (Enero, Febrero...)
    const sqlMesesAnio = `
        SELECT 
            MONTHNAME(fecha) AS mes, 
            SUM(monto_total) AS total 
        FROM historial_ventas 
        WHERE YEAR(fecha) = YEAR(CURDATE())
        GROUP BY MONTH(fecha), MONTHNAME(fecha)
        ORDER BY MONTH(fecha);
    `;

    // Ejecutamos las consultas en cadena
    db.query(sqlHoy, (errHoy, resHoy) => {
        if (errHoy) return res.status(500).json({ error: "Error calculando hoy" });

        db.query(sqlDiasSemana, (errDias, resDias) => {
            if (errDias) return res.status(500).json({ error: "Error calculando días" });

            db.query(sqlMesesAnio, (errMeses, resMeses) => {
                if (errMeses) return res.status(500).json({ error: "Error calculando meses" });

                res.json({
                    ventas_hoy_real: parseFloat(resHoy[0].total_hoy),
                    ventas_por_dias_semana: resDias, // Retorna array: [{dia_semana: 'Monday', total: 150.50}, ...]
                    ventas_por_meses: resMeses       // Retorna array: [{mes: 'July', total: 4500.00}, ...]
                });
            });
        });
    });
});

// =========================================================================
// 🚀 INYECTOR MASIVO TOTALMENTE CÓDIGOS DE BARRA (RESUELVE NOMBRES Y COLUMNAS)
// =========================================================================
app.get('/api/admin/cargar-agropets', (req, res) => {
    
    // 1. Limpiamos cualquier rastro de tablas viejas conflictivas
    db.query("DROP TABLE IF EXISTS productos;", (errDrop1) => {
        db.query("DROP TABLE IF EXISTS producto;", (errDrop2) => {
            
            // 2. Creamos la tabla 'productos' (plural) usando BIGINT para soportar códigos de barra largos
            const sqlTablaPlural = `
                CREATE TABLE productos (
                    id BIGINT PRIMARY KEY,
                    nombre VARCHAR(255) NOT NULL,
                    cantidad INT NOT NULL DEFAULT 0,
                    stock INT NOT NULL DEFAULT 0,
                    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    categoria VARCHAR(100) DEFAULT 'General'
                );
            `;

            db.query(sqlTablaPlural, (errPlural) => {
                if (errPlural) return res.status(500).send("Error creando tabla plural: " + errPlural.message);

                // 3. Creamos la tabla 'producto' (singular) con la misma estructura idéntica
                const sqlTablaSingular = `
                    CREATE TABLE producto (
                        id BIGINT PRIMARY KEY,
                        nombre VARCHAR(255) NOT NULL,
                        cantidad INT NOT NULL DEFAULT 0,
                        stock INT NOT NULL DEFAULT 0,
                        precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        categoria VARCHAR(100) DEFAULT 'General'
                    );
                `;

                db.query(sqlTablaSingular, (errSingular) => {
                    if (errSingular) return res.status(500).send("Error creando tabla singular: " + errSingular.message);

                    // 4. Catálogo Completo de tus 75 productos con sus Códigos de Barras Asignados
                    const listaAgropets = [
                        [7750100058, "Ricocan 7+ Años Adulto Raza Med/Gde x15kg", 12, 105.00, "Perros - Secos"],
                        [7750100059, "Ricocan Cordero y Cereales Adulto Raza Med/Gde x22kg", 2, 150.70, "Perros - Secos"],
                        [7750100060, "Ricocan Cordero y Cereales Adulto Raza Pequeña x15kg", 8, 105.00, "Perros - Secos"],
                        [7750100061, "Ricocan Multisabores Adultos Todas las Razas x22kg", 1, 150.70, "Perros - Secos"],
                        [7750100062, "Ricocan Original Adultos Todas las Razas x15kg", 15, 105.00, "Perros - Secos"],
                        [7750100063, "Ricocan Extruido Cachorros Carne/Leche Raza Peq x15kg", 6, 109.50, "Perros - Secos"],
                        [7750100064, "Ricocan Extruido Cachorros Carne/Leche Raza Med/Gde x22kg", 4, 157.50, "Perros - Secos"],
                        [7750100065, "Supercan Cachorros Carne y Leche x15kg", 10, 97.50, "Perros - Secos"],
                        [7750100066, "Supercan Adulto Carne y Cereales x25kg", 3, 140.00, "Perros - Secos"],
                        [7750100067, "Supercan Adulto Sabor Cordero x15kg", 9, 90.00, "Perros - Secos"],
                        [7750100068, "Supercan Adulto Buffet de Sabores x25kg", 14, 140.00, "Perros - Secos"],
                        [7750100069, "Yango Sabor Carne Adulto Todas las Razas x25kg", 7, 95.00, "Perros - Secos"],
                        [7750100070, "Bandido Extruido Adulto Carne x18kg", 11, 73.50, "Perros - Secos"],
                        [7750100071, "Thor Carne, Hígado y Cereales Adultos x25kg", 5, 107.50, "Perros - Secos"],
                        [7750100072, "Thor Carne Cachorros x25kg", 6, 112.50, "Perros - Secos"],
                        [7750100073, "Mimaskot Carne, Cereales y Vegetales x15kg", 8, 93.00, "Perros - Secos"],
                        [7750100074, "Mimaskot Adulto Carne, Pollo y Cereales Raza Peq x15kg", 4, 93.00, "Perros - Secos"],
                        [7750100075, "Mimaskot Adulto Carne, Pollo y Cereales Raza Peq x25kg", 2, 145.00, "Perros - Secos"],
                        [7750100076, "Mimaskot Carne/Cereales Cachorro Raza Med/Gde x15kg", 6, 93.00, "Perros - Secos"],
                        [7750100077, "Mimaskot Carne/Cereales Cachorro Raza Med/Gde x25kg", 3, 145.00, "Perros - Secos"],
                        [7750100078, "Mimaskot Carne/Cereales Cachorro Raza Pequeña x15kg", 9, 93.00, "Perros - Secos"],
                        [7750100079, "Nutrican Cachorro Perros x15kg", 11, 67.00, "Perros - Secos"],
                        [7750100080, "Nutrican Adulto Perros x15kg", 14, 69.00, "Perros - Secos"],
                        [7750100081, "Nutrican Adulto Perros x25kg", 5, 108.00, "Perros - Secos"],
                        [7750100082, "Zeus Adulto Perros x25kg", 7, 90.00, "Perros - Secos"],
                        [7750100083, "Zeus Cachorro Perros x25kg", 4, 93.00, "Perros - Secos"],
                        [7750100084, "Ricocat Festival de Sabores Adulto x15kg", 8, 133.00, "Gatos - Secos"],
                        [7750100085, "Ricocat Pollo, Sardina y Salmón Adulto x09kg", 2, 81.00, "Gatos - Secos"],
                        [7750100086, "Ricocat Carne, Salmón y Leche Adulto x09kg", 12, 81.00, "Gatos - Secos"],
                        [7750100087, "Ricocat Atún, Sardina y Trucha Adulto x09kg", 9, 81.00, "Gatos - Secos"],
                        [7750100088, "Ricocat Esterilizados Adulto x09kg", 4, 81.00, "Gatos - Secos"],
                        [7750100089, "Supercat Sardina, Atún y Trucha Adulto x09kg", 10, 70.50, "Gatos - Secos"],
                        [7750100090, "Supercat Carne y Leche Cachorros x09kg", 3, 67.50, "Gatos - Secos"],
                        [7750100091, "Ricocat Carne, Pescado y Leche Cachorro x15kg", 5, 111.00, "Gatos - Secos"],
                        [7750100092, "Michicat Pollo, Sardina y Atún Adulto x09kg", 15, 85.00, "Gatos - Secos"],
                        [7750100093, "Maxicat Pollo y Pescado Adulto x15kg", 7, 139.00, "Gatos - Secos"],
                        [7750100094, "Mimaskot Gatitos Pollo, Carne y Leche x9kg", 6, 75.00, "Gatos - Secos"],
                        [7750100095, "Mimaskot Gatos Adultos Salmón, Atún y Sardina x9kg", 10, 70.00, "Gatos - Secos"],
                        [7750100096, "Mimaskot Gatos Adultos Pollo, Carne y Salmón x9kg", 8, 70.00, "Gatos - Secos"],
                        [7750100097, "Nutrican Gatos Atún y Sardina x9kg", 12, 58.00, "Gatos - Secos"],
                        [7750100098, "Nutrican Gatos Adultos x25kg", 3, 110.00, "Gatos - Secos"],
                        [7750100099, "Arena Sanitaria Mimaskot para Gatos x5kg", 25, 13.00, "Gatos - Arena"],
                        [7750100100, "Arena Sanitaria Mimaskot para Gatos x10kg", 18, 23.00, "Gatos - Arena"],
                        [7750100101, "Arena Sanitaria Mimaskot para Gatos x20kg", 1, 40.00, "Gatos - Arena"],
                        [7750100102, "Caja Latas Ricocan Pate/Trocitos x24und (330gr)", 4, 102.00, "Húmedos"],
                        [7750100103, "Caja Latas Ricocat Húmedo Pate x24und (330gr)", 6, 115.00, "Húmedos"],
                        [7750100104, "Caja Pouches Ricocan Trocitos x15und (100gr)", 20, 25.00, "Húmedos"],
                        [7750100105, "Caja Pouches Ricocat Húmedo x15und (85gr)", 18, 26.00, "Húmedos"],
                        [7750100106, "Caja Latas Thor Adulto/Cachorro x24und (330gr)", 3, 92.00, "Húmedos"],
                        [7750100107, "Caja Latas Supercan Guisos x24und (280gr)", 5, 81.00, "Húmedos"],
                        [7750100108, "Shampoo Ricocan Frasco x380ml", 25, 12.00, "Higiene"],
                        [7750100109, "Shampoo Fresh Can Frasco x300ml", 30, 8.00, "Higiene"],
                        [7750100110, "Snack Ricocrack Caja x12und", 10, 72.00, "Snacks"],
                        // 🌾 Línea Agrícola (IDs adaptados numéricamente para compatibilidad)
                        [8001, "Super Plus Inicio Pellet 40kg (B001)", 15, 117.00, "Agrícola - Aves"],
                        [8002, "Super Plus Crecimiento Pellet 40kg (B002)", 2, 115.00, "Agrícola - Aves"],
                        [8003, "Super Plus Engorde Pellet 40kg (B003)", 8, 110.00, "Agrícola - Aves"],
                        [8004, "Polvo Super Plus Inicio Harinado 40kg (B004)", 12, 99.00, "Agrícola - Aves"],
                        [8005, "Polvo Super Plus Crecimiento Harinado 40kg (B005)", 4, 98.00, "Agrícola - Aves"],
                        [8006, "Polvo Super Plus Engorde Harinado 40kg (B006)", 20, 94.00, "Agrícola - Aves"],
                        [8007, "Hi Premium Buenamicyn-a Etts 40kg (B007)", 5, 130.00, "Agrícola - Aves"],
                        [8008, "Hi Premium Buenamicyn-a 20x1kg Etts 20kg (B008)", 10, 76.00, "Agrícola - Aves"],
                        [8009, "Hi Premium Buenamicyn-a Micro Pellet 40kg (B009)", 3, 135.00, "Agrícola - Aves"],
                        [8010, "Hi Premium Inicio Etts 40kg (B010)", 14, 119.00, "Agrícola - Aves"],
                        [8011, "Hi Premium Crecimiento Pellet 40kg (B011)", 6, 120.00, "Agrícola - Aves"],
                        [8012, "Hi Premium Engorde Pellet 40kg (B012)", 11, 118.00, "Agrícola - Aves"],
                        [8013, "Postura Hi Premium Pellet 40kg (B013)", 7, 110.00, "Agrícola - Aves"],
                        [8014, "Postura Hi Premium Polvo Harinado 40kg (B014)", 12, 96.00, "Agrícola - Aves"],
                        [8015, "Conejo Plus Hi-T Crecimiento Pellet 40kg (B015)", 9, 92.00, "Agrícola - Mamíferos"],
                        [8016, "Conejo Plus Hi-R Reproductora Pellet 40kg (B016)", 2, 95.00, "Agrícola - Mamíferos"],
                        [8017, "Cuy Plus Hi-E Crecimiento Pellet 40kg (B017)", 15, 95.00, "Agrícola - Mamíferos"],
                        [8018, "Cuy Plus Hi-R Reproductora Pellet 40kg (B018)", 4, 90.00, "Agrícola - Mamíferos"],
                        [8019, "Cuy Hi Premium Crecimiento Polvo Harinado 40kg (B019)", 8, 86.00, "Agrícola - Mamíferos"],
                        [8020, "Pura Casta Inicio Etts 40kg (B020)", 13, 122.00, "Agrícola - Gallos"],
                        [8021, "Pura Casta Crecimiento Pellet 40kg (B021)", 5, 117.00, "Agrícola - Gallos"],
                        [8022, "Pura Casta Acabado Pellet 40kg (B022)", 16, 112.00, "Agrícola - Gallos"],
                        [8023, "Pura Casta Muda Pellet 40kg (B023)", 3, 123.00, "Agrícola - Gallos"],
                        [8024, "Cerdos Eco Pig 1 Micro Pellet 25kg (B024)", 6, 145.00, "Agrícola - Cerdos"],
                        [8025, "Cerdos Eco Pig 2 Micro Pellet 25kg (B025)", 10, 127.00, "Agrícola - Cerdos"],
                        [8026, "Cerdos Eco Pig 3 Micro Pellet 25kg (B026)", 4, 109.00, "Agrícola - Cerdos"],
                        [8027, "Cerdos Gestación Hi Pig Harinado Polvo 40kg (B027)", 12, 76.00, "Agrícola - Cerdos"],
                        [8028, "Cerdos Lactancia Hi Pig Harinado Polvo 40kg (B028)", 7, 99.00, "Agrícola - Cerdos"],
                        [8029, "Cerdos Inicio 7+ Hi Pig Polvo Harinado 40kg (B029)", 2, 127.00, "Agrícola - Cerdos"],
                        [8030, "Cerdos Inicio 12+ Hi Pig Polvo Harinado 40kg (B030)", 9, 109.00, "Agrícola - Cerdos"],
                        [8031, "Cerdos Eco Pig 2 Polvo Harinado 40kg (B031)", 5, 176.00, "Agrícola - Cerdos"],
                        [8032, "Cerdos Eco Pig 3 Polvo Harinado 40kg (B032)", 8, 149.00, "Agrícola - Cerdos"],
                        [8033, "Cerdos Crecimiento Hi Pig (1) Harinado Polvo 40kg (B033)", 11, 96.00, "Agrícola - Cerdos"],
                        [8034, "Cerdos Crecimiento Hi Pig (2) Harinado Polvo 40kg (B034)", 14, 90.00, "Agrícola - Cerdos"],
                        [8035, "Cerdos Engorde Hi Pig Polvo Harinado 40kg (B035)", 3, 94.00, "Agrícola - Cerdos"],
                        [8036, "Pavo Hi Premium Inicio Etts 40kg (B036)", 6, 133.00, "Agrícola - Pavos"],
                        [8037, "Pavo Hi Premium Crecimiento Pellet 40kg (B037)", 4, 116.00, "Agrícola - Pavos"],
                        [8038, "Pavo Hi Premium Acabado Pellet 40kg (B038)", 10, 113.00, "Agrícola - Pavos"],
                        // 🛒 Línea Comercial
                        [9001, "Mercado Crecimiento Pellet 40kg (C001)", 18, 60.00, "Agrícola - Comercial"],
                        [9002, "Mercado Engorde Pellet 40kg (C002)", 22, 60.00, "Agrícola - Comercial"],
                        [9003, "Carne Crecimiento Pellet 40kg (C003)", 5, 70.00, "Agrícola - Comercial"],
                        [9004, "Carne Engorde Pellet 40kg (C004)", 11, 70.00, "Agrícola - Comercial"],
                        [9005, "Concentrado Mercado Carne Harinado 40kg (C005)", 14, 65.00, "Agrícola - Comercial"],
                        [9006, "Super Carne Inicio Etts 40kg (C006)", 2, 101.00, "Agrícola - Comercial"],
                        [9007, "Super Carne Crecimiento Pellet 40kg (C007)", 9, 101.00, "Agrícola - Comercial"],
                        [9008, "Super Carne Engorde Pellet 40kg (C008)", 7, 101.00, "Agrícola - Comercial"],
                        [9009, "Cuy Carne Pellet 40kg (C009)", 3, 78.00, "Agrícola - Comercial"],
                        [9010, "Cuy Carne Polvo Harinado 40kg (C010)", 12, 73.00, "Agrícola - Comercial"],
                        [9011, "Conejo Carne Pellet 40kg (C011)", 6, 80.00, "Agrícola - Comercial"]
                    ];

                    // 5. Mapeamos respetando el ID asignado en la posición 0 de cada subarray
                    const datosHibridos = listaAgropets.map(p => [
                        p[0], // id (Código de barras o ID numérico adaptado)
                        p[1], // nombre
                        p[2], // cantidad
                        p[2], // stock (duplicado)
                        p[3], // precio
                        p[3], // precio_venta (duplicado)
                        p[4]  // categoria
                    ]);

                    const queryInsertarPlural = 'INSERT INTO productos (id, nombre, cantidad, stock, precio, precio_venta, categoria) VALUES ?';
                    const queryInsertarSingular = 'INSERT INTO producto (id, nombre, cantidad, stock, precio, precio_venta, categoria) VALUES ?';

                    // Insertamos en la tabla plural
                    db.query(queryInsertarPlural, [datosHibridos], (errInsert1) => {
                        if (errInsert1) return res.status(500).send("Error insertando en productos: " + errInsert1.message);

                        // Insertamos en la tabla singular
                        db.query(queryInsertarSingular, [datosHibridos], (errInsert2) => {
                            if (errInsert2) return res.status(500).send("Error insertando en producto: " + errInsert2.message);

                            res.send(`<h1>🎉 ¡Base de datos BLINDADA y vinculada a Códigos de Barra!</h1><p>Se reestructuraron las tablas con IDs reales de barra. Ya puedes usar '7750100058' en Android.</p>`);
                        });
                    });
                });
            });
        });
    });
});

// Definimos el puerto dinámico de Render o el 3000 para local
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo exitosamente en el puerto ${PORT}`);
});