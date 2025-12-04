// Google Drive API Service
// Uses Google Identity Services for authentication

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient = null;
let accessToken = localStorage.getItem('googleAccessToken') || null;

// Guardar token en localStorage
const saveToken = (token) => {
    accessToken = token;
    if (token) {
        localStorage.setItem('googleAccessToken', token);
    } else {
        localStorage.removeItem('googleAccessToken');
    }
};

// Inicializar Google Identity Services
export const initGoogleAuth = (clientId) => {
    return new Promise((resolve, reject) => {
        if (!clientId) {
            reject(new Error('Google Client ID no configurado'));
            return;
        }

        // Cargar el script de Google Identity Services si no existe
        if (!window.google?.accounts) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                initTokenClient(clientId);
                resolve(true);
            };
            script.onerror = () => reject(new Error('Error cargando Google API'));
            document.head.appendChild(script);
        } else {
            initTokenClient(clientId);
            resolve(true);
        }
    });
};

const initTokenClient = (clientId) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response) => {
            if (response.access_token) {
                saveToken(response.access_token);
            }
        },
    });
};

// Solicitar autorización
export const requestGoogleAuth = () => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Google Auth no inicializado'));
            return;
        }

        tokenClient.callback = (response) => {
            if (response.error) {
                reject(new Error(response.error));
                return;
            }
            saveToken(response.access_token);
            resolve(accessToken);
        };

        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};

// Verificar si está autenticado
export const isGoogleAuthenticated = () => {
    return !!accessToken;
};

// Verificar si el token es válido haciendo un request de prueba
export const verifyToken = async () => {
    if (!accessToken) return false;

    try {
        const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (response.status === 401) {
            accessToken = null; // Token expirado
            return false;
        }
        return response.ok;
    } catch {
        return false;
    }
};

// Renovar token si es necesario
export const ensureAuthenticated = async () => {
    const isValid = await verifyToken();
    if (!isValid) {
        console.log('🔄 Token expirado, renovando...');
        return await requestGoogleAuth();
    }
    return accessToken;
};

// Crear carpeta en Google Drive si no existe
const getOrCreateFolder = async (folderName) => {
    // Buscar carpeta existente
    const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );

    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    // Crear carpeta
    const createResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            })
        }
    );

    const createData = await createResponse.json();
    return createData.id;
};

// Subir archivo a Google Drive
export const uploadToGoogleDrive = async (fileName, content, folderId = null) => {
    console.log('uploadToGoogleDrive:', { fileName, folderId, hasToken: !!accessToken });

    if (!accessToken) {
        throw new Error('No autenticado con Google');
    }

    const metadata = {
        name: fileName,
        mimeType: 'application/json'
    };

    if (folderId) {
        metadata.parents = [folderId];
    }

    // Crear multipart request
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(content, null, 2) +
        closeDelim;

    console.log('Enviando request a Google Drive...');

    const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary="${boundary}"`
            },
            body: multipartRequestBody
        }
    );

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error?.message || `Error ${response.status}`);
    }

    const result = await response.json();
    console.log('Upload success:', result.id);
    return result;
};

// Hacer backup de un workflow
export const backupWorkflow = async (workflow) => {
    // Obtener o crear carpeta de backups
    const folderId = await getOrCreateFolder('n8n-backups');

    // Crear nombre de archivo con fecha
    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${workflow.name}_${date}.json`;

    // Subir archivo
    const result = await uploadToGoogleDrive(fileName, workflow, folderId);

    return {
        success: true,
        fileName,
        fileId: result.id,
        webViewLink: `https://drive.google.com/file/d/${result.id}/view`
    };
};

// Hacer backup de todos los workflows (un archivo por cada uno)
export const backupAllWorkflows = async (workflows, onProgress) => {
    console.log('🚀 Iniciando backup de', workflows.length, 'workflows');

    // Verificar y renovar token si es necesario
    await ensureAuthenticated();

    const folderId = await getOrCreateFolder('n8n-backups');
    console.log('📁 Carpeta ID:', folderId);

    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const results = [];

    for (let i = 0; i < workflows.length; i++) {
        const workflow = workflows[i];
        const safeName = workflow.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
        const fileName = `${safeName}_${date}.json`;

        console.log(`📤 Subiendo ${i + 1}/${workflows.length}: ${fileName}`);

        try {
            const result = await uploadToGoogleDrive(fileName, workflow, folderId);
            console.log('✅ Subido:', result.id);
            results.push({ success: true, name: workflow.name, fileName });

            if (onProgress) {
                onProgress(i + 1, workflows.length, workflow.name);
            }
        } catch (err) {
            console.error('❌ Error:', workflow.name, err.message);
            results.push({ success: false, name: workflow.name, error: err.message });
        }
    }

    const successCount = results.filter(r => r.success).length;
    console.log('✨ Backup completado:', successCount, '/', workflows.length);

    return {
        success: true,
        count: successCount,
        total: workflows.length,
        results
    };
};
