using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using MailKit.Net.Smtp;
using MailKit.Security;

namespace Project.Services
{
    public class EmailService : IEmailSender
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
        {
            string host = _config["SmtpSettings:Host"] ?? "smtp.gmail.com";
            int port = int.Parse(_config["SmtpSettings:Port"] ?? "587");
            string senderEmail = _config["SmtpSettings:SenderEmail"] ?? "";
            string senderName = _config["SmtpSettings:SenderName"] ?? "Aura Nocturne";
            string password = _config["SmtpSettings:Password"] ?? "";

            var email = new MimeMessage();
            email.From.Add(new MailboxAddress(senderName, senderEmail));
            email.To.Add(MailboxAddress.Parse(toEmail));
            email.Subject = subject;

            var builder = new BodyBuilder { HtmlBody = htmlMessage };
            email.Body = builder.ToMessageBody();

            using var smtp = new SmtpClient();
            try
            {
                await smtp.ConnectAsync(host, port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(senderEmail, password);
                await smtp.SendAsync(email);
                await smtp.DisconnectAsync(true);
                _logger.LogInformation($"Password reset email successfully sent to {toEmail}");
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email to {toEmail}");
                throw;
            }
        }
    }
}
