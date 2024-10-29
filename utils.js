const fs = require('fs').promises;
const contentful = require('contentful-management');
require('dotenv').config();
const path = require('path');

async function parseTemplateFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const fields = {};

        // Split content into lines and process each line
        const lines = content.split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                // Match content between '- ' and '-'
                const match = line.match(/^(.*?)-\s*(.*?)-$/);
                if (match) {
                    const fieldName = match[1].trim();
                    const fieldValue = match[2].trim();
                    fields[fieldName.toLowerCase()] = fieldValue;
                }
            }
        });
        // console.log('Parsed fields:', fields);
        return fields;
    } catch (error) {
        console.error('Error parsing template file:', error);
        return null;
    }
}

async function listContentTypes() {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        const contentTypes = await environment.getContentTypes();

        console.log('Available Content Types:');
        contentTypes.items.forEach(contentType => {
            console.log(`- ${contentType.name} (ID: ${contentType.sys.id})`);
        });

        return contentTypes.items;
    } catch (error) {
        console.error('Error in listContentTypes function:', error);
    }
}


async function getContentModelFields(contentTypeId) {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        const contentType = await environment.getContentType(contentTypeId);

        console.log(`Fields for Content Type: ${contentType.name}`);
        contentType.fields.forEach(field => {
            console.log(`- ${field.name} (${field.type})`);
        });

        return contentType.fields;
    } catch (error) {
        console.error('Error in getContentModelFields function:', error);
    }
}


async function getContentTypeFields(contentTypeId) {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        const contentType = await environment.getContentType(contentTypeId);

        console.log(`Fields for Content Type: ${contentType.name} (ID: ${contentTypeId})`);
        contentType.fields.forEach(field => {
            console.log(`- ${field.name} (${field.type})`);
        });

        return contentType.fields;
    } catch (error) {
        console.error('Error in getContentTypeFields function:', error);
        return null;
    }
}

async function checkApiEndpoint() {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);

        // Get the raw HTTP client to inspect the API URL
        const rawClient = client.getHttpClient();

        console.log('API Base URL:', rawClient.defaults.baseURL);
        console.log('Space Endpoint:', space.toPlainObject().sys.endpoint);

        return rawClient.defaults.baseURL;
    } catch (error) {
        console.error('Error checking API endpoint:', error);
    }
}


async function helloWorld() {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        console.log('Hello World! Connected to Contentful space:', space.name);
        return space.name;
    } catch (error) {
        console.error('Error in helloWorld function:', error);
    }
}

async function parsePhotosToFiles(directoryPath) {
    try {
        const files = await fs.readdir(directoryPath);

        // Filter out template.txt and get only files (not directories)
        const photoFiles = files.filter(file =>
            file !== 'template.txt' &&
            !file.startsWith('.') // Exclude hidden files
        );

        // console.log(`Found ${photoFiles.length} photos in directory: ${directoryPath}`);
        return photoFiles;
    } catch (error) {
        console.error('Error parsing photos:', error);
        return [];
    }
}

module.exports = { parseTemplateFile, listContentTypes, getContentModelFields, helloWorld, parsePhotosToFiles };