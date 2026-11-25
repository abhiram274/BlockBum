#include "sendcoinsdialog.hpp"
#include <QFormLayout>
#include <QHBoxLayout>
#include <QMessageBox>

namespace blockbum::qt {

SendCoinsDialog::SendCoinsDialog(QWidget* parent)
    : QDialog(parent) {
    setupUi();
}

void SendCoinsDialog::setupUi() {
    setWindowTitle("Send BUM Coins — BlockBum Core");
    setMinimumWidth(480);
    setStyleSheet("background-color: #0E0E14; color: #FFFFFF;");

    auto* layout = new QVBoxLayout(this);
    layout->setContentsMargins(20, 20, 20, 20);
    layout->setSpacing(16);

    auto* header = new QLabel("⚡ Send BUM Transaction", this);
    header->setStyleSheet("color: #FFB800; font-size: 18px; font-weight: bold;");
    layout->addWidget(header);

    auto* form_layout = new QFormLayout();
    form_layout->setSpacing(12);

    recipient_edit_ = new QLineEdit(this);
    recipient_edit_->setPlaceholderText("bb1...");
    recipient_edit_->setStyleSheet("background-color: #161622; color: #FFFFFF; border: 1px solid #3A3220; padding: 8px; border-radius: 4px;");

    amount_edit_ = new QLineEdit(this);
    amount_edit_->setPlaceholderText("0.00000000");
    amount_edit_->setStyleSheet("background-color: #161622; color: #FFD700; border: 1px solid #3A3220; padding: 8px; border-radius: 4px; font-weight: bold;");

    fee_edit_ = new QLineEdit(this);
    fee_edit_->setText("0.00010000");
    fee_edit_->setStyleSheet("background-color: #161622; color: #94A3B8; border: 1px solid #3A3220; padding: 8px; border-radius: 4px;");

    form_layout->addRow("Recipient Address:", recipient_edit_);
    form_layout->addRow("Amount (BUM):", amount_edit_);
    form_layout->addRow("Network Fee (BUM):", fee_edit_);

    layout->addLayout(form_layout);

    status_label_ = new QLabel("", this);
    status_label_->setStyleSheet("color: #EF4444; font-size: 12px;");
    layout->addWidget(status_label_);

    auto* btn_layout = new QHBoxLayout();
    btn_layout->addStretch();

    auto* cancel_btn = new QPushButton("Cancel", this);
    cancel_btn->setObjectName("goldBtn");
    connect(cancel_btn, &QPushButton::clicked, this, &QDialog::reject);

    auto* send_btn = new QPushButton("Sign & Broadcast (Ed25519)", this);
    connect(send_btn, &QPushButton::clicked, this, &SendCoinsDialog::handleSend);

    btn_layout->addWidget(cancel_btn);
    btn_layout->addWidget(send_btn);

    layout->addLayout(btn_layout);
}

void SendCoinsDialog::handleSend() {
    QString recipient = recipient_edit_->text().trimmed();
    if (!recipient.startsWith("bb1") || recipient.length() < 30) {
        status_label_->setText("Invalid BlockBum recipient address format (must start with bb1)");
        return;
    }

    bool ok = false;
    double amount = amount_edit_->text().toDouble(&ok);
    if (!ok || amount <= 0.0) {
        status_label_->setText("Please specify a valid positive BUM amount");
        return;
    }

    double fee = fee_edit_->text().toDouble(&ok);
    if (!ok || fee < 0.0) {
        fee = 0.0001;
    }

    emit coinsSent(recipient, amount, fee);
    QMessageBox::information(
        this,
        "Transaction Broadcasted",
        QString("Transaction successfully signed using Monocypher Ed25519 and broadcast to network!\n\nRecipient: %1\nAmount: %2 BUM\nFee: %3 BUM")
            .arg(recipient).arg(amount, 0, 'f', 8).arg(fee, 0, 'f', 8)
    );
    accept();
}

} // namespace blockbum::qt
