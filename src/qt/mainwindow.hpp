#pragma once

#include <QMainWindow>
#include <QTabWidget>
#include <QLabel>
#include <QAction>
#include <memory>

namespace blockbum::qt {

class OverviewPage;

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget* parent = nullptr);
    ~MainWindow() override = default;

private slots:
    void showSendDialog();
    void showReceiveDialog();
    void showAboutDialog();
    void showCryptoAuditDialog();
    void lockVault();

private:
    void createActions();
    void createMenus();
    void createToolBars();
    void createStatusBar();
    void setupCentralWidget();

    QTabWidget* tab_widget_{nullptr};
    OverviewPage* overview_page_{nullptr};

    // Actions
    QAction* send_action_{nullptr};
    QAction* receive_action_{nullptr};
    QAction* lock_vault_action_{nullptr};
    QAction* about_action_{nullptr};
    QAction* crypto_audit_action_{nullptr};
    QAction* quit_action_{nullptr};

    // Status bar widgets
    QLabel* status_height_label_{nullptr};
    QLabel* status_peers_label_{nullptr};
    QLabel* status_crypto_label_{nullptr};
    QLabel* status_vault_label_{nullptr};
};

} // namespace blockbum::qt
