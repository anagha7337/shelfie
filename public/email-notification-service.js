// EMAIL NOTIFICATION SERVICE with EmailJS
// This service sends email reminders for expiring items

export class EmailNotificationService {
    constructor(serviceId, templateId, publicKey, firebaseRefs) {
        this.serviceId = serviceId;
        this.templateId = templateId;
        this.publicKey = publicKey;
        
        // Store Firebase references
        this.query = firebaseRefs.query;
        this.where = firebaseRefs.where;
        this.collection = firebaseRefs.collection;
        this.getDocs = firebaseRefs.getDocs;
        
        // Initialize EmailJS (will be called when needed)
        if (typeof emailjs !== 'undefined') {
            emailjs.init(this.publicKey);
        }
    }

    // Send reminder email for expiring items
    async sendReminderEmail(userEmail, userName, items) {
        try {
            // Create formatted list of items
            const itemsList = items.map(item => {
                const expiryDate = new Date(item.expiryDate);
                const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                
                let status = '';
                if (daysUntilExpiry <= 0) {
                    status = '🔴 EXPIRED';
                } else if (daysUntilExpiry === 1) {
                    status = '🔴 Expires tomorrow';
                } else if (daysUntilExpiry <= 3) {
                    status = `🟠 Expires in ${daysUntilExpiry} days`;
                } else if (daysUntilExpiry <= 7) {
                    status = `🟡 Expires in ${daysUntilExpiry} days`;
                } else {
                    status = `🟢 Expires in ${daysUntilExpiry} days`;
                }
                
                return `${item.productName} (${item.category}) - ${status} - ${expiryDate.toLocaleDateString()}`;
            }).join('\n');

            // Sort items by urgency for summary
            const expired = items.filter(i => new Date(i.expiryDate) < new Date()).length;
            const expiringSoon = items.filter(i => {
                const days = Math.ceil((new Date(i.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                return days > 0 && days <= 3;
            }).length;
            const expiringThisWeek = items.filter(i => {
                const days = Math.ceil((new Date(i.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                return days > 3 && days <= 7;
            }).length;

            // Create summary text
            let summaryText = '';
            if (expired > 0) summaryText += `${expired} item(s) have expired. `;
            if (expiringSoon > 0) summaryText += `${expiringSoon} item(s) expire within 3 days. `;
            if (expiringThisWeek > 0) summaryText += `${expiringThisWeek} item(s) expire this week.`;

            const templateParams = {
                to_email: userEmail,
                user_name: userName || userEmail.split('@')[0],
                items_list: itemsList,
                items_count: items.length,
                summary_text: summaryText || `You have ${items.length} item(s) to check.`,
                expired_count: expired,
                expiring_soon_count: expiringSoon,
                expiring_week_count: expiringThisWeek
            };

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams
            );

            console.log('✅ Email sent successfully:', response);
            
            // Store last email sent date
            localStorage.setItem('lastEmailSent', new Date().toDateString());
            
            return true;
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            return false;
        }
    }

    // Check if we should send email today
    shouldSendEmail() {
        const lastSent = localStorage.getItem('lastEmailSent');
        const today = new Date().toDateString();
        return lastSent !== today;
    }

    // Get items that need reminders
    async getItemsNeedingReminders(db, auth) {
        try {
            const now = new Date();
            
            // Use the Firebase functions passed in constructor
            const q = this.query(
                this.collection(db, 'shelfItems'),
                this.where('userId', '==', auth.currentUser.uid)
            );
            
            const querySnapshot = await this.getDocs(q);
            const items = [];
            
            querySnapshot.forEach((doc) => {
                const item = doc.data();
                const reminderDate = new Date(item.reminderDate);
                const expiryDate = new Date(item.expiryDate);
                
                // Include items that have passed reminder date and haven't expired more than 1 day ago
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                
                if (reminderDate <= now && expiryDate >= oneDayAgo) {
                    items.push({
                        ...item,
                        id: doc.id
                    });
                }
            });
            
            console.log(`Found ${items.length} items needing reminders:`, items);
            return items;
            
        } catch (error) {
            console.error('Error getting items:', error);
            return [];
        }
    }

    // Send daily digest
    async sendDailyDigest(db, auth, userEmail, userName) {
        try {
            // Check if we already sent email today
            if (!this.shouldSendEmail()) {
                console.log('Email already sent today');
                return false;
            }
            
            const items = await this.getItemsNeedingReminders(db, auth);
            
            if (items.length > 0) {
                console.log(`Sending email for ${items.length} items`);
                return await this.sendReminderEmail(userEmail, userName, items);
            } else {
                console.log('No items need reminders');
                return false;
            }
            
        } catch (error) {
            console.error('Error sending daily digest:', error);
            return false;
        }
    }

    // Manual send (for testing or user-triggered)
    async sendNow(db, auth, userEmail, userName) {
        const items = await this.getItemsNeedingReminders(db, auth);
        
        if (items.length > 0) {
            return await this.sendReminderEmail(userEmail, userName, items);
        } else {
            alert('No items need reminders at this time!');
            return false;
        }
    }

    // Start automatic daily check (checks every hour, sends once per day)
    startDailyCheck(db, auth, userEmail, userName) {
        // Check immediately
        this.sendDailyDigest(db, auth, userEmail, userName);
        
        // Then check every hour (but will only send once per day)
        this.checkInterval = setInterval(() => {
            this.sendDailyDigest(db, auth, userEmail, userName);
        }, 60 * 60 * 1000); // Every hour
    }

    stopDailyCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}