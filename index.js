const contentful = require('contentful-management');
const fs = require('fs').promises;
const path = require('path');
const { parseTemplateFile, listContentTypes, getContentModelFields, parsePhotos } = require('./utils');

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});


async function postMuralEntry(templateData, photos) {
    console.log('Posting mural entry with data:', templateData);
    // try {
    //     // const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
    //     // const environment = await space.getEnvironment('master');

    //     // const entry = await environment.createEntry('mural', {
    //     //     fields: {
    //     //         title: {
    //     //             'en-US': templateData.title
    //     //         },
    //     //         location: {
    //     //             'en-US': templateData.location
    //     //         },
    //     //         description: {
    //     //             'en-US': templateData.description
    //     //         },
    //     //         category: {
    //     //             'en-US': templateData.category
    //     //         }
    //     //     }
    //     // });

    //     // console.log('Entry created successfully:', entry.sys.id);
    //     return entry;
    // } catch (error) {
    //     console.error('Error creating entry:', error);
    //     return null;
    // }
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
                const photos = await parsePhotosToFiles(fullDirPath);

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


const directoryPath = path.join(__dirname, 'contentfull_data_post');
// Process all templates in the directory
processTemplateDirectory(directoryPath)
    .then(() => {
        console.log('All templates processed successfully');
    })
    .catch(error => {
        console.error('Error processing templates:', error);
    });


// // Call the function
// checkApiEndpoint()
//     .then(baseUrl => {
//         console.log('API check completed');
//     })
//     .catch(error => {
//         console.error('Error:', error);
//     });


// Examples of how to call each function individually:

// 1. List Content Types
// listContentTypes()
//     .then(contentTypes => {
//         console.log('Content types listed successfully');
//     })
//     .catch(error => {
//         console.error('Error listing content types:', error);
//     });

// getContentTypeFields('mural')
//     .then(fields => {
//         if (fields) {
//             console.log('Fields for mural content type retrieved successfully');
//             fields.forEach(field => {
//                 console.log(`Field: ${field.name}, Type: ${field.type}`);
//             });
//         } else {
//             console.log('No fields found for the mural content type');
//         }
//     })
//     .catch(error => {
//         console.error('Error getting content type fields for mural:', error);
//     });

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

// Uncomment to process all templates
/*
processTemplateDirectory(directoryPath)
    .then(() => {
        console.log('All templates processed');
    })
    .catch(error => {
        console.error('Error processing templates:', error);
    });
*/
