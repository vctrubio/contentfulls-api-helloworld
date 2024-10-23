const contentful = require('contentful-management');
require('dotenv').config();

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

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

async function postEntry() {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        // Replace 'exampleContentTypeId' with your actual content type ID
        const entry = await environment.createEntry('exampleContentTypeId', {
            fields: {
                title: {
                    'en-US': 'Hello from Node.js'
                },
                body: {
                    'en-US': 'This entry was created using the Contentful Management API and Node.js!'
                }
            }
        });

        console.log('Entry created:', entry);
        return entry;
    } catch (error) {
        console.error('Error in postEntry function:', error);
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

// Examples of how to call each function individually:

// 1. List Content Types
// listContentTypes()
//     .then(contentTypes => {
//         console.log('Content types listed successfully');
//     })
//     .catch(error => {
//         console.error('Error listing content types:', error);
//     });

getContentTypeFields('mural')
    .then(fields => {
        if (fields) {
            console.log('Fields for mural content type retrieved successfully');
            fields.forEach(field => {
                console.log(`Field: ${field.name}, Type: ${field.type}`);
            });
        } else {
            console.log('No fields found for the mural content type');
        }
    })
    .catch(error => {
        console.error('Error getting content type fields for mural:', error);
    });

// 2. Get Content Type Fields (uncomment and modify contentTypeId as needed)
/*
getContentTypeFields('mural')
    .then(fields => {
        if (fields) {
            console.log('Fields retrieved successfully');
        } else {
            console.log('No fields found for the specified content type');
        }
    })
    .catch(error => {
        console.error('Error getting content type fields:', error);
    });
*/

// 3. Hello World function
/*
helloWorld()
    .then(spaceName => {
        console.log('Hello World function completed');
    })
    .catch(error => {
        console.error('Error in Hello World function:', error);
    });
*/

// 4. Post Entry function (make sure to replace 'exampleContentTypeId' with a valid ID)
/*
postEntry()
    .then(entry => {
        console.log('Entry posted successfully');
    })
    .catch(error => {
        console.error('Error posting entry:', error);
    });
*/
