const contentful = require('contentful-management');
const fs = require('fs').promises;
const path = require('path');
const { parseTemplateFile, listContentTypes, getContentModelFields, parsePhotos, checkApiEndpoint, getContentTypeFields } = require('./utils');




async function postMuralEntry(templateData, photos) {
    const fields = await getContentTypeFields('mural');
    console.log('Posting mural entry with data:', templateData);
}

// Function to process all templates in the directory
async function processTemplateDirectory(directoryPath) {
    try {
        const directories = await fs.readdir(directoryPath);

        for (const dir of directories) {
            const fullDirPath = path.join(directoryPath, dir);
            const templatePath = path.join(fullDirPath, 'template.txt');

            try {
                // Get template data
                const templateData = await parseTemplateFile(templatePath);

                // Get photos in the same directory
                const photos = await parsePhotos(fullDirPath);

                console.log('\x1b[33m%s\x1b[0m', '----------------------------------------');
                console.log(`Directory ${dir}:`);
                console.log('Template data:', templateData);
                console.log('Photos found:', photos);
                // Post the mural entry with template data
                const createdEntry = await postMuralEntry(templateData, photos);
                if (createdEntry) {
                    console.log('Successfully created mural entry');
                } else {
                    console.log('Failed to create mural entry');
                }
            } catch (error) {
                console.error(`Error processing directory ${dir}:`, error);
                continue;
            }
        }
    } catch (error) {
        console.error('Error processing directory:', error);
    }
}

async function trigger() {
    const directoryPath = path.join(__dirname, 'contentfull_data_post');
    try {
        await processTemplateDirectory(directoryPath);
        console.log('All templates processed successfully');
    } catch (error) {
        console.error('Error processing templates:', error);
    }
}

trigger()

///////////////////////////////////////////////////////////////////////////
async function checkApiAndContentTypes() {
    console.log('Starting API and content type checks...');

    try {
        const baseUrl = await checkApiEndpoint();
        console.log('API check completed');


        const contentTypes = await listContentTypes();
        console.log('Content types listed successfully');

        const fields = await getContentTypeFields('mural');
        if (fields) {
            console.log('Fields for mural content type retrieved successfully');
            fields.forEach(field => {
                console.log(`Field: ${field.name}, Type: ${field.type}`);
            });
        } else {
            console.log('No fields found for the mural content type');
        }

    } catch (error) {
        console.error('Error in checkApiAndContentTypes:', error);
    }
}

// checkApiAndContentTypes()