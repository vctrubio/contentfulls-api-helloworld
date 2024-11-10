const contentful = require('contentful-management');
const fs = require('fs').promises;
const path = require('path');
const { parseTemplateFile, listContentTypes, getContentModelFields, parsePhotos, checkApiEndpoint, getContentTypeFields, fetchAllContent, confirmDeletion, deleteAllEntriesOfType } = require('./utils');
const process = require('process');

let existingTitles = new Set(); // Store existing titles
let contentfulClient = null;
let contentfulSpace = null;
let contentfulEnvironment = null;

async function waitForAssetProcessing(asset, maxAttempts = 2) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            console.log(`Processing attempt ${attempt + 1}/${maxAttempts}...`);
            const processedAsset = await asset.processForAllLocales();
            return processedAsset;
        } catch (error) {
            if (attempt === maxAttempts - 1) {
                throw error;
            }
            // Wait for 2 seconds before next attempt (increases with each attempt)
            const waitTime = 2000 * (attempt + 1);
            console.log(`Waiting ${waitTime / 1000} seconds before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

async function uploadPhoto(environment, photoPath) {
    try {
        const fileName = path.basename(photoPath);
        const extension = path.extname(fileName).toLowerCase();

        const validExtensions = ['.jpg', '.jpeg', '.png'];
        if (!validExtensions.includes(extension)) {
            console.warn(`Skipping invalid file type: ${fileName}`);
            return null;
        }

        const contentType = extension === '.png' ? 'image/png' : 'image/jpeg';

        // Read file
        const fileBuffer = await fs.readFile(photoPath);
        const fileSizeInMB = fileBuffer.length / (1024 * 1024);

        console.log(`Processing ${fileName} (${fileSizeInMB.toFixed(2)}MB)`);

        // Create upload
        console.log('Creating upload...');
        const upload = await environment.createUpload({
            file: fileBuffer
        });

        // Create the asset with uploadFrom instead of upload URL
        console.log(`Creating asset for ${fileName}...`);
        const asset = await environment.createAsset({
            fields: {
                title: {
                    'en-US': fileName
                },
                description: {
                    'en-US': `Photo for mural: ${fileName}`
                },
                file: {
                    'en-US': {
                        contentType: contentType,
                        fileName: fileName,
                        uploadFrom: {
                            sys: {
                                type: 'Link',
                                linkType: 'Upload',
                                id: upload.sys.id
                            }
                        }
                    }
                }
            }
        });

        console.log('Processing asset...');
        const processedAsset = await waitForAssetProcessing(asset);

        console.log('Publishing asset...');
        const publishedAsset = await processedAsset.publish();

        console.log(`Successfully uploaded and published photo: ${fileName}`);
        return publishedAsset;
    } catch (error) {
        console.error('Error uploading photo:', error.message);
        console.error('Photo path:', photoPath);
        return null;  // Return null instead of throwing to continue with other photos
    }
}

async function initializeContentful() {
    if (!contentfulClient) {
        contentfulClient = contentful.createClient({
            accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
        });
        contentfulSpace = await contentfulClient.getSpace(process.env.CONTENTFUL_SPACE_ID);
        contentfulEnvironment = await contentfulSpace.getEnvironment('master');
        
        // Fetch all existing mural titles
        console.log('Fetching existing mural titles...');
        const entries = await contentfulEnvironment.getEntries({
            content_type: 'mural'
        });
        
        existingTitles = new Set(
            entries.items
                .map(entry => entry.fields.title?.['en-US'])
                .filter(title => title) // Remove any undefined titles
        );
        
        console.log(`Cached ${existingTitles.size} existing titles`);
    }
    return { client: contentfulClient, space: contentfulSpace, environment: contentfulEnvironment };
}

async function postMuralEntry(templateData, photos, dirPath) {
    try {
        // Use cached Contentful connection
        const { environment } = await initializeContentful();

        // Check if title exists using the cached Set
        if (existingTitles.has(templateData.Title)) {
            console.log(`Entry with title "${templateData.Title}" already exists. Skipping...`);
            return null;
        }

        // Create URL-friendly version of the title
        const urlFriendlyTitle = templateData.Title.toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^a-z0-9-]/g, '')     // Remove any non-alphanumeric characters except -
            .replace(/-+/g, '-');           // Replace multiple - with single -

        // Upload photos first
        const photoAssets = [];
        for (const photo of photos) {
            const photoPath = path.join(dirPath, photo);
            console.log('\nUploading photo:', photo);
            const asset = await uploadPhoto(environment, photoPath);
            if (asset) {
                photoAssets.push({
                    sys: {
                        type: 'Link',
                        linkType: 'Asset',
                        id: asset.sys.id
                    }
                });
            }
        }

        // Format the entry data according to Contentful's structure
        const entryData = {
            fields: {
                title: {
                    'en-US': templateData.Title
                },
                location: {
                    'en-US': templateData.Location
                },
                description: {
                    'en-US': templateData.Description
                },
                category: {
                    'en-US': templateData.Category
                },
                url: {
                    'en-US': urlFriendlyTitle
                },
                photos: {
                    'en-US': photoAssets
                }
            }
        };

        console.log('Creating entry with data:', JSON.stringify(entryData, null, 2));
        const entry = await environment.createEntry('mural', entryData);

        // Publish the entry
        const publishedEntry = await entry.publish();

        // Add the new title to our cached Set
        existingTitles.add(templateData.Title);

        console.log('Entry created and published with ID:', publishedEntry.sys.id);
        return publishedEntry;

    } catch (error) {
        console.error('Error creating mural entry:', error);
        throw error;
    }
}

// Function to process all templates in the directory
async function processTemplateDirectory(directoryPath = path.join(__dirname, 'contentfull_data_post')) {
    try {
        const directories = await fs.readdir(directoryPath);
        let processedCount = 0;

        for (const dir of directories) {
            const fullDirPath = path.join(directoryPath, dir);
            const templatePath = path.join(fullDirPath, 'template.txt');

            try {
                const templateData = await parseTemplateFile(templatePath);
                const photos = await parsePhotos(fullDirPath);

                console.log('\x1b[33m%s\x1b[0m', '----------------------------------------');
                console.log(`Directory ${dir}:`);
                console.log('Template data:', templateData);
                console.log('Photos found:', photos);
                
                const createdEntry = await postMuralEntry(templateData, photos, fullDirPath);
                if (createdEntry) {
                    console.log('Successfully created mural entry with photos');
                    processedCount++;
                } else {
                    console.log('Failed to create mural entry');
                }
            } catch (error) {
                console.error(`Error processing directory ${dir}:`, error);
                continue;
            }
        }

        return processedCount; // Return the number of processed entries
    } catch (error) {
        console.error('Error processing directory:', error);
        throw error;
    }
}

async function trigger(flag = true) {
    const directoryPath = path.join(__dirname, 'contentfull_data_post');

    try {
        // Fetch all content first
        if (flag) {
            console.log('\nFetching all existing content...');
            const allContent = await fetchAllContent();

            // Log summary of content
            Object.entries(allContent).forEach(([contentTypeName, data]) => {
                console.log(`\n${contentTypeName}:`);
                console.log(`- Total entries: ${data.entries.length}`);
                console.log('- Fields:', data.fields.map(f => f.name).join(', '));
            });
            // Check if Mural content type exists and log detailed information
            if (allContent['Mural']) {
                console.log('\nDetailed Mural Entries:');
                allContent['Mural'].entries.forEach((entry, index) => {
                    console.log(`\nMural Entry ${index + 1}:`);
                    Object.entries(entry.fields).forEach(([fieldName, fieldValue]) => {
                        if (fieldValue['en-US']) {
                            if (Array.isArray(fieldValue['en-US'])) {
                                console.log(`${fieldName}:`, fieldValue['en-US'].length > 0 ?
                                    `[${fieldValue['en-US'].map(item =>
                                        item.sys ? `Asset ID: ${item.sys.id}` : item
                                    ).join(', ')}]` : '[]'
                                );
                            } else {
                                console.log(`${fieldName}:`, fieldValue['en-US']);
                            }
                        }
                    });
                });
            }
        }

        // console.log('\nProcessing new content...');
        // await processTemplateDirectory(directoryPath);
        // console.log('All templates processed successfully');

    } catch (error) {
        console.error('Error in trigger function:', error);
    }
}

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


async function main() {
    console.log('hello n welcome.')

    try {
        // Initialize Contentful connection and cache titles at startup
        await initializeContentful();

        const args = process.argv.slice(2);
        const command = args[0];
        const contentType = args[1];

        switch (command) {
            case 'trigger':
                await trigger();
                break;
            case 'pt':
                const processedCount = await processTemplateDirectory();
                console.log(`Processed ${processedCount} entries successfully`);
                break;
            case 'checkApi':
                await checkApiAndContentTypes();
                break;
            case 'delete':
                if (!contentType) {
                    console.error('Please specify a content type to delete. Example: node index.js delete mural');
                    break;
                }
                const confirmed = await confirmDeletion(contentType);
                if (confirmed) {
                    await deleteAllEntriesOfType(contentType);
                } else {
                    console.log('Deletion cancelled.');
                }
                break;
            default:
                console.log('\x1b[31m%s\x1b[0m', `Unknown command: ${command}`);
                console.log('Available commands: trigger, checkApi, processTemplates, delete');
                break;
        }
    } catch (error) {
        console.error('Error executing command:', error);
    } finally {
        // Cleanup and exit
        if (contentfulClient) {
            console.log('Cleaning up connections...');
            // Add any necessary cleanup for contentful client
        }
        console.log('Done. Exiting...');
        process.exit(0);
    }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// If you want to handle cleanup on SIGINT (Ctrl+C)
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Cleaning up...');
    process.exit(0);
});

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});


const directoryPath = path.join(__dirname, 'contentfull_data_post');