To update the Firebase Cloud Function to run every 1 minute, you need to modify the schedule expression. Here's how you can do it:

### Step-by-Step Instructions

1. **Edit the Function Schedule**:

   Open the `functions/index.js` file and change the schedule expression to run every 1 minute:

   ```javascript
   const functions = require('firebase-functions');
   const admin = require('firebase-admin');
   const fetch = require('node-fetch');

   admin.initializeApp();

   exports.updateResults = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
       const apiUrl = 'https://api.bdg88zf.com/api/webapi/GetNoaverageEmerdList';
       const requestData = {
           "pageSize": 10,
           "pageNo": 1,
           "typeId": 1,
           "language": 0,
           "random": "c2505d9138da4e3780b2c2b34f2fb789",
           "signature": "7D637E060DA35C0C6E28DC6D23D71BED",
           "timestamp": Math.floor(Date.now() / 1000),
       };

       try {
           const response = await fetch(apiUrl, {
               method: 'POST',
               headers: {
                   'Content-Type': 'application/json;charset=UTF-8',
               },
               body: JSON.stringify(requestData),
           });

           if (response.ok) {
               const data = await response.json();
               const db = admin.database();

               data.data.list.forEach(result => {
                   const { issueNumber, colour, number } = result;
                   const resultRef = db.ref('results/' + issueNumber);
                   resultRef.set({ issueNumber, colour, number });
               });

               console.log('Results updated successfully.');
           } else {
               console.error('HTTP Error:', response.statusText);
           }
       } catch (error) {
           console.error('Network Error:', error.message);
       }
   });
   ```

2. **Deploy the Updated Function**:

   - After modifying the schedule, deploy the function again to apply your changes:
     ```bash
     firebase deploy --only functions
     ```

### Important Considerations

- **Quota and


